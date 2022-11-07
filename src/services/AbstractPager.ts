import type {Observable} from 'rxjs';
import {BehaviorSubject, ReplaySubject, Subscription, combineLatest} from 'rxjs';
import {distinctUntilChanged, filter, map, pairwise, take, tap} from 'rxjs/operators';
import {Writable} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import Pager, {PageFetch, PagerConfig} from 'types/Pager';
import {Logger} from 'utils';

const UNINITIALIZED: any[] = [];

const logger = new Logger('AbstractPager');

let pagerCount = 0;

export default abstract class AbstractPager<T extends MediaObject> implements Pager<T> {
    protected readonly items$ = new BehaviorSubject<readonly T[]>(UNINITIALIZED);
    protected readonly size$ = new ReplaySubject<number>(1);
    protected readonly maxSize$ = new ReplaySubject<number>(1);
    protected readonly error$ = new ReplaySubject<unknown>(1);
    protected readonly fetches$ = new BehaviorSubject<PageFetch>({index: 0, length: 0});
    protected subscriptions?: Subscription;
    protected disconnected = false;
    protected config: PagerConfig;

    constructor(options?: PagerConfig) {
        this.config = {...options};
        if (options?.maxSize) {
            this.maxSize$.next(options?.maxSize);
        }
    }

    observeComplete(): Observable<readonly T[]> {
        return combineLatest([this.observeItems(), this.observeSize()]).pipe(
            filter(([items, size]) => items.reduce((total) => (total += 1), 0) === size),
            map(([items]) => items),
            take(1)
        );
    }

    observeItems(): Observable<readonly T[]> {
        return this.items$.pipe(filter((items) => items !== UNINITIALIZED));
    }

    observeSize(): Observable<number> {
        return this.size$.pipe(distinctUntilChanged());
    }

    observeMaxSize(): Observable<number> {
        return this.maxSize$.pipe(distinctUntilChanged());
    }

    observeError(): Observable<unknown> {
        return this.error$;
    }

    disconnect(): void {
        if (!this.disconnected) {
            this.disconnected = true;
            if (this.subscriptions) {
                this.subscriptions.unsubscribe();
                logger.log(`Pager disconnected. connected pagers=${--pagerCount}`);
            }
            this.items.forEach((item) => (item as any).pager?.disconnect());
            this.items$.complete();
            this.size$.complete();
            this.maxSize$.complete();
            this.error$.complete();
        }
    }

    fetchAt(index: number, length = 50): void {
        if (this.disconnected) {
            logger.warn('disconnected');
            return;
        }

        if (!this.subscriptions) {
            this.connect();

            if (this.config.calculatePageSize) {
                const {minPageSize = 10, maxPageSize = 100} = this.config;
                const pageSize = Math.ceil((length * 2) / 10) * 10;
                (this.config as Writable<PagerConfig>).pageSize = Math.max(
                    Math.min(pageSize, maxPageSize),
                    minPageSize
                );
            }
        }

        this.fetches$.next({index, length});
    }

    protected get items(): readonly T[] {
        return this.items$.getValue();
    }

    protected get maxSize(): number {
        return this.config?.maxSize ?? Infinity;
    }

    protected connect(): void {
        if (!this.subscriptions) {
            logger.log(`Pager connected. connected pagers=${++pagerCount}`);

            this.subscriptions = new Subscription();

            this.subscriptions.add(
                this.observeAdditions()
                    .pipe(tap((items) => this.addMissingTrackCounts(items)))
                    .subscribe(logger)
            );
        }
    }

    private observeAdditions(): Observable<readonly T[]> {
        return this.items$.pipe(
            pairwise(),
            map(([oldItems, newItems]) =>
                newItems.filter(
                    (newItem) => !oldItems.find((oldItem) => oldItem.src === newItem.src)
                )
            )
        );
    }

    private addMissingTrackCounts(items: readonly T[]): void {
        items.forEach((item) => {
            if (item.itemType === ItemType.Playlist && !item.trackCount && item.pager) {
                const src = item.src;
                this.subscriptions!.add(
                    item.pager
                        .observeSize()
                        .pipe(
                            tap((size) => {
                                const index = this.items.findIndex((item) => item.src === src);
                                if (index !== -1) {
                                    const items = this.items.slice();
                                    const item = items[index];
                                    items[index] = {...item, trackCount: size};
                                    this.items$.next(items);
                                }
                            })
                        )
                        .subscribe(logger)
                );
            }
        });
    }
}
