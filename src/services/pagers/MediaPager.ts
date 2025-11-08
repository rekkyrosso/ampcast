import type {Observable, Subscribable} from 'rxjs';
import {
    BehaviorSubject,
    Subscription,
    combineLatest,
    distinctUntilChanged,
    filter,
    map,
    skipWhile,
    take,
    tap,
} from 'rxjs';
import ChildOf from 'types/ChildOf';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MetadataChange from 'types/MetadataChange';
import Pager, {PagerConfig} from 'types/Pager';
import SortParams from 'types/SortParams';
import {Logger, exists, uniq} from 'utils';
import actionsStore from 'services/actions/actionsStore';
import {observeMetadataChanges} from 'services/metadata';
import {observeSourceSorting} from 'services/mediaServices/servicesSettings';

export interface PageFetch {
    readonly index: number;
    readonly length: number;
}

const UNINITIALIZED: any[] = [];

const logger = new Logger('MediaPager');

let pagerCount = 0;

export type CreateChildPager<T extends MediaObject> = (
    item: T,
    childSort?: SortParams
) => Pager<ChildOf<T>>;

export default abstract class MediaPager<T extends MediaObject> implements Pager<T> {
    private readonly additions$ = new BehaviorSubject<readonly T[]>(UNINITIALIZED);
    private readonly error$ = new BehaviorSubject<unknown>(undefined);
    private readonly items$ = new BehaviorSubject<readonly T[]>(UNINITIALIZED);
    private readonly fetches$ = new BehaviorSubject<PageFetch>({index: 0, length: 0});
    private readonly size$ = new BehaviorSubject(-1);
    private readonly busy$ = new BehaviorSubject(false);
    private readonly srcs = new Set<string>();
    private subscriptions?: Subscription;
    #disconnected = false;

    constructor(
        protected config: PagerConfig,
        private readonly createChildPager?: CreateChildPager<T>
    ) {}

    get connected(): boolean {
        return !!this.subscriptions;
    }

    get disconnected(): boolean {
        return this.#disconnected;
    }

    get maxSize(): number | undefined {
        return this.config.maxSize;
    }

    get pageSize(): number {
        return this.config.pageSize;
    }

    get passive(): boolean {
        return !!this.config.passive;
    }

    observeAdditions(): Observable<readonly T[]> {
        return this.additions$.pipe(skipWhile((additions) => additions === UNINITIALIZED));
    }

    observeBusy(): Observable<boolean> {
        return this.busy$.pipe(distinctUntilChanged());
    }

    observeError(): Observable<unknown> {
        return this.error$.pipe(
            skipWhile((error) => error === undefined),
            distinctUntilChanged()
        );
    }

    observeItems(): Observable<readonly T[]> {
        return this.items$.pipe(skipWhile((items) => items === UNINITIALIZED));
    }

    observeSize(): Observable<number> {
        return this.size$.pipe(
            skipWhile((size) => size === -1),
            distinctUntilChanged()
        );
    }

    disconnect(): void {
        if (!this.disconnected) {
            this.#disconnected = true;
            if (this.subscriptions) {
                this.subscriptions.unsubscribe();
                if (__dev__) {
                    pagerCount--;
                    if (pagerCount === 0) {
                        logger.info(`All pagers disconnected. Connected pagers=${pagerCount}.`);
                    }
                }
            }
            this.items.forEach((item) => (item as any)?.pager?.disconnect());
            this.items$.complete();
            this.additions$.complete();
            this.size$.complete();
            this.error$.complete();
        }
    }

    fetchAt(index: number, length = this.config.pageSize): void {
        if (this.disconnected) {
            logger.warn('disconnected');
            return;
        }

        if (!length) {
            length = 50;
        }

        if (!this.connected) {
            this.connect();
        }

        this.fetches$.next({index, length});
    }

    protected get busy(): boolean {
        return this.busy$.value;
    }

    protected set busy(busy: boolean) {
        this.busy$.next(busy);
    }

    protected get childSortId(): string {
        return this.config.childSortId || '';
    }

    protected get error(): unknown {
        return this.error$.value;
    }

    protected set error(error: unknown) {
        this.error$.next(error);
    }

    protected get items(): readonly T[] {
        return this.items$.value;
    }

    protected set items(items: readonly T[]) {
        if (this.passive) {
            this.items$.next(items);
        } else {
            const additions: T[] = [];
            this.items$.next(
                items.map((item) => {
                    if (!this.srcs.has(item.src)) {
                        this.srcs.add(item.src);
                        const inLibrary = actionsStore.getInLibrary(item, item.inLibrary);
                        const rating = actionsStore.getRating(item, item.rating);
                        if (item.inLibrary !== inLibrary || item.rating !== rating) {
                            item = {...item, inLibrary, rating};
                        }
                        additions.push(item);
                    }
                    return item;
                })
            );
            if (additions.length > 0) {
                this.additions$.next(additions);
            }
        }
    }

    protected get size(): number | undefined {
        const size = this.size$.value;
        return size === -1 ? undefined : size;
    }

    protected set size(size: number) {
        size = Math.min(size, this.maxSize ?? Infinity);
        this.size$.next(size);
    }

    protected observeComplete(): Observable<readonly T[]> {
        return combineLatest([this.observeItems(), this.observeSize()]).pipe(
            filter(([items, size]) => items.reduce((total) => (total += 1), 0) === size),
            map(([items]) => items),
            take(1)
        );
    }

    protected observeFetches(): Observable<PageFetch> {
        return this.fetches$.pipe(filter(({length}) => length > 0));
    }

    protected connect(): void {
        if (!this.connected && !this.disconnected) {
            if (__dev__) {
                pagerCount++;
                if (pagerCount % 100 === 0) {
                    logger.warn(`Too many pagers? Connected pagers=${pagerCount}.`);
                }
            }

            this.subscriptions = new Subscription();

            if (!this.passive) {
                this.subscribeTo(
                    this.observeAdditions().pipe(tap((items) => this.addMultiDisc(items))),
                    logger
                );

                this.subscribeTo(
                    this.observeAdditions().pipe(tap((items) => this.addTrackCount(items))),
                    logger
                );

                if (!this.passive) {
                    this.subscribeTo(
                        observeMetadataChanges<T>().pipe(
                            tap((changes) => this.applyMetadataChanges(changes))
                        ),
                        logger
                    );
                }
            }

            if (this.childSortId && this.createChildPager) {
                this.subscribeTo(
                    observeSourceSorting(this.childSortId).pipe(
                        tap((childSort) => this.updateChildSort(this.createChildPager!, childSort))
                    ),
                    logger
                );
            }

            this.subscribeTo(this.observeComplete().pipe(tap(() => (this.busy = false))), logger);
        }
    }

    protected subscribeTo<T>(subscribable: Subscribable<T>, logger: Logger): void {
        this.subscriptions!.add(subscribable.subscribe(logger));
    }

    private applyMetadataChanges(changes: readonly MetadataChange<T>[]): void {
        let changed = false;
        const items = this.items.map((item) => {
            for (const {match, values} of changes) {
                if (match(item)) {
                    changed = true;
                    return {...item, ...values};
                }
            }
            return item;
        });
        if (changed) {
            this.items$.next(items);
        }
    }

    private addMultiDisc(items: readonly T[]): void {
        items.forEach((item) => {
            if (item.itemType === ItemType.Album && item.multiDisc === undefined) {
                this.subscribeTo(
                    item.pager.observeItems().pipe(
                        skipWhile(([item]) => !item?.album),
                        tap((tracks) => {
                            const src = item.src;
                            const index = this.items.findIndex((item) => item.src === src);
                            if (index !== -1) {
                                const items = this.items.slice();
                                const item = items[index];
                                const discs = uniq(
                                    tracks.map((track) => track.disc).filter(exists)
                                );
                                const multiDisc = discs.length > 1 || discs[0] > 1;
                                items[index] = {...item, multiDisc};
                                this.items$.next(items);
                            }
                        })
                    ),
                    logger
                );
            }
        });
    }

    private addTrackCount(items: readonly T[]): void {
        items.forEach((item) => {
            if (
                (item.itemType === ItemType.Album || item.itemType === ItemType.Playlist) &&
                !item.trackCount &&
                item.pager
            ) {
                this.subscribeTo(
                    item.pager.observeSize().pipe(
                        tap((size) => {
                            const src = item.src;
                            const index = this.items.findIndex((item) => item.src === src);
                            if (index !== -1) {
                                const items = this.items.slice();
                                const item = items[index];
                                items[index] = {...item, trackCount: size};
                                this.items$.next(items);
                            }
                        })
                    ),
                    logger
                );
            }
        });
    }

    private updateChildSort(createChildPager: CreateChildPager<T>, childSort?: SortParams): void {
        this.items = this.items.map((item) => {
            if ('pager' in item) {
                item.pager.disconnect();
                (item as any).pager = createChildPager(item, childSort); // Make sure to overwrite.
                return {...item};
            } else {
                return item;
            }
        });
    }
}
