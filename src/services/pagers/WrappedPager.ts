import type {Observable} from 'rxjs';
import {
    BehaviorSubject,
    Subscription,
    combineLatest,
    distinctUntilChanged,
    filter,
    map,
    of,
    startWith,
    take,
    tap,
} from 'rxjs';
import MediaObject from 'types/MediaObject';
import Pager from 'types/Pager';
import {Logger} from 'utils';
import {PageFetch} from './AbstractPager';

const logger = new Logger('WrappedPager');

export default class WrappedPager<T extends MediaObject> implements Pager<T> {
    private readonly fetches$ = new BehaviorSubject<PageFetch>({index: 0, length: 0});
    private subscriptions?: Subscription;
    private disconnected = false;

    constructor(
        private readonly headerPager: Pager<T> | undefined,
        private readonly bodyPager: Pager<T>,
        private readonly footerPager?: Pager<T> | undefined // Only one page supported.
    ) {}

    get maxSize(): number | undefined {
        return undefined;
    }

    observeBusy(): Observable<boolean> {
        return combineLatest([
            this.headerPager?.observeBusy() || of(false),
            this.bodyPager.observeBusy(),
            this.footerPager?.observeBusy() || of(false),
        ]).pipe(
            map(([headerBusy, bodyBusy, footerBusy]) => headerBusy || bodyBusy || footerBusy),
            distinctUntilChanged()
        );
    }

    observeItems(): Observable<readonly T[]> {
        return combineLatest([
            this.headerPager?.observeItems() || of([]),
            this.bodyPager.observeItems(),
            this.footerPager?.observeItems() || of([]),
            this.observeComplete(),
        ]).pipe(
            map(([headerItems, bodyItems, footerItems, complete]) =>
                headerItems.concat(complete ? bodyItems.concat(footerItems) : bodyItems)
            )
        );
    }

    observeSize(): Observable<number> {
        return combineLatest([
            this.observeHeaderSize(),
            this.bodyPager.observeSize(),
            this.footerPager?.observeSize() || of(0),
            this.observeComplete(),
        ]).pipe(
            map(
                ([headerSize, bodySize, footerSize, complete]) =>
                    headerSize + bodySize + (complete ? footerSize : 0)
            )
        );
    }

    observeError(): Observable<unknown> {
        return this.bodyPager.observeError();
    }

    disconnect(): void {
        if (!this.disconnected) {
            this.disconnected = true;
            this.subscriptions?.unsubscribe();
            this.headerPager?.disconnect();
            this.bodyPager.disconnect();
            this.footerPager?.disconnect();
        }
    }

    fetchAt(index: number, length: number): void {
        if (this.disconnected) {
            logger.warn('disconnected');
            return;
        }
        if (!this.subscriptions) {
            this.connect();
        }
        this.fetches$.next({index, length});
    }

    private connect(): void {
        if (!this.subscriptions) {
            this.subscriptions = new Subscription();

            if (this.headerPager) {
                this.subscriptions.add(
                    this.observeFetches()
                        .pipe(
                            take(1),
                            tap(({index, length}) => this.headerPager!.fetchAt(index, length))
                        )
                        .subscribe(logger)
                );
            }

            this.subscriptions.add(
                combineLatest([this.observeHeaderSize(), this.observeFetches()])
                    .pipe(
                        tap(([headerSize, fetch]) =>
                            this.bodyPager.fetchAt(
                                Math.max(fetch.index - headerSize, 0),
                                fetch.length
                            )
                        )
                    )
                    .subscribe(logger)
            );

            if (this.footerPager) {
                this.subscriptions.add(
                    this.observeComplete()
                        .pipe(tap(() => this.footerPager!.fetchAt(0)))
                        .subscribe(logger)
                );
            }
        }
    }

    private observeComplete(): Observable<boolean> {
        return combineLatest([this.bodyPager.observeItems(), this.bodyPager.observeSize()]).pipe(
            map(([items, size]) => items.reduce((total) => (total += 1), 0) === size),
            startWith(false),
            distinctUntilChanged()
        );
    }

    private observeFetches(): Observable<PageFetch> {
        return this.fetches$.pipe(filter((fetch) => fetch.length > 0));
    }

    private observeHeaderSize(): Observable<number> {
        return (
            this.headerPager?.observeSize().pipe(
                startWith(0),
                map((size) => size || 0),
                distinctUntilChanged()
            ) || of(0)
        );
    }
}
