import type {Observable} from 'rxjs';
import {EMPTY, BehaviorSubject, combineLatest, of} from 'rxjs';
import {catchError, concatMap, filter, map, switchMap, takeUntil, take, tap} from 'rxjs/operators';
import MediaObject from 'types/MediaObject';
import {Page, PagerConfig} from 'types/Pager';
import {exists, Logger, uniqBy} from 'utils';
import AbstractPager from './AbstractPager';

const logger = new Logger('SequentialPager');

export default class SequentialPager<T extends MediaObject> extends AbstractPager<T> {
    protected readonly fetching$ = new BehaviorSubject(false);
    protected maxEmptyCount = 2;
    private emptyCount = 0;

    constructor(
        private readonly fetchNext: (pageSize: number | undefined) => Promise<Page<T>>,
        options?: PagerConfig
    ) {
        super(options);
    }

    protected connect(): void {
        if (!this.subscriptions) {
            super.connect();

            // TODO: better error handling.
            this.subscriptions!.add(
                this.observeShouldFetch()
                    .pipe(
                        tap(() => this.fetching$.next(true)),
                        concatMap(() => this.fetchNext(this.config.pageSize)),
                        tap((page) => this.addPage(page)),
                        catchError((err: unknown) => {
                            logger.error(err);
                            this.error$.next(err);
                            return of(undefined);
                        }),
                        tap(() => this.fetching$.next(false)),
                        takeUntil(this.observeComplete()),
                        take(100)
                    )
                    .subscribe(logger)
            );
        }
    }

    private observeShouldFetch(): Observable<void> {
        const shouldFetch$ = combineLatest([this.fetches$, this.items$]).pipe(
            map(([{index, length}, items]) => index + 2 * length >= items.length),
            filter((shouldFetch) => shouldFetch),
            map(() => undefined),
            take(1)
        );
        return this.fetching$.pipe(switchMap((fetching) => (fetching ? EMPTY : shouldFetch$)));
    }

    private addPage(page: Page<T>): void {
        const newItems = (page.items || []).filter(exists);
        const items = uniqBy(this.items.concat(newItems), 'src');
        if (items.length === this.items.length) {
            // Nothing got added.
            this.emptyCount++;
        }
        items.length = Math.min(items.length, this.maxSize ?? Infinity);
        const atEnd =
            page.atEnd || items.length === this.maxSize || this.emptyCount > this.maxEmptyCount;
        const size = atEnd ? items.length : page.total;
        if (size !== undefined) {
            this.size$.next(size);
        }
        this.items$.next(items);
    }
}
