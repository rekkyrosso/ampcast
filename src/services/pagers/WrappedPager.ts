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
    switchMap,
    take,
    tap,
} from 'rxjs';
import MediaObject from 'types/MediaObject';
import Pager from 'types/Pager';
import {Logger} from 'utils';

const logger = new Logger('WrappedPager');

export default class WrappedPager<T extends MediaObject> implements Pager<T> {
    private readonly fetches$ = new BehaviorSubject(-1);
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

    get pageSize(): number {
        return this.bodyPager.pageSize;
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

    observeComplete(): Observable<void> {
        return this.bodyPager
            .observeComplete()
            .pipe(
                switchMap(() =>
                    this.footerPager ? this.footerPager.observeComplete() : of(undefined)
                )
            );
    }

    observeItems(): Observable<readonly T[]> {
        return combineLatest([
            this.headerPager?.observeItems() || of([]),
            this.bodyPager.observeItems(),
            this.footerPager?.observeItems() || of([]),
            this.observeBodyComplete(),
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
            this.observeBodyComplete(),
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

    disconnect(keepChildrenConnected?: boolean): void {
        if (!this.disconnected) {
            this.disconnected = true;
            this.subscriptions?.unsubscribe();
            this.headerPager?.disconnect(keepChildrenConnected);
            this.bodyPager.disconnect(keepChildrenConnected);
            this.footerPager?.disconnect(keepChildrenConnected);
        }
    }

    fetchAt(index: number): void {
        if (this.disconnected) {
            logger.warn('disconnected');
            return;
        }
        if (!this.subscriptions) {
            this.connect();
        }
        this.fetches$.next(index);
    }

    private connect(): void {
        if (!this.subscriptions) {
            this.subscriptions = new Subscription();

            if (this.headerPager) {
                this.subscribeTo(
                    this.observeFetches().pipe(
                        tap((index) => this.headerPager!.fetchAt(index)),
                        take(1)
                    )
                );
            }

            this.subscribeTo(
                combineLatest([this.observeHeaderSize(), this.observeFetches()]).pipe(
                    tap(([headerSize, index]) =>
                        this.bodyPager.fetchAt(Math.max(index - headerSize, 0))
                    )
                )
            );

            if (this.footerPager) {
                this.subscribeTo(
                    this.observeBodyComplete().pipe(tap(() => this.footerPager!.fetchAt(0)))
                );
            }
        }
    }

    private observeBodyComplete(): Observable<boolean> {
        return combineLatest([this.bodyPager.observeItems(), this.bodyPager.observeSize()]).pipe(
            map(([items, size]) => items.reduce((total) => (total += 1), 0) === size),
            startWith(false),
            distinctUntilChanged()
        );
    }

    private observeFetches(): Observable<number> {
        return this.fetches$.pipe(filter((index) => index !== -1));
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

    private subscribeTo<T>(observable$: Observable<T>): void {
        this.subscriptions!.add(observable$.subscribe(logger));
    }
}
