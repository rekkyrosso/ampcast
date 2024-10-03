import {catchError, concatMap, mergeMap, of, take, takeUntil, tap} from 'rxjs';
import MediaObject from 'types/MediaObject';
import {Page, PagerConfig} from 'types/Pager';
import {exists, Logger, uniqBy} from 'utils';
import AbstractPager from './AbstractPager';

const logger = new Logger('SequentialPager');

export default class SequentialPager<T extends MediaObject> extends AbstractPager<T> {
    private readonly maxFetchCount = 100;
    private readonly maxEmptyCount = 2;
    private fetchCount = 0;
    private emptyCount = 0;

    constructor(
        private readonly fetchNext: (pageSize: number | undefined) => Promise<Page<T>>,
        options?: PagerConfig
    ) {
        super(options);
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();

            this.subscribeTo(
                this.observeFetches().pipe(
                    tap(() => (this.busy = true)),
                    concatMap(({index, length}) => {
                        if (
                            index + length + 2 >= this.items.length &&
                            this.fetchCount < this.maxFetchCount
                        ) {
                            this.fetchCount++;
                            return of(undefined).pipe(
                                tap(() => (this.error = undefined)),
                                mergeMap(() => this.fetchNext(this.config.pageSize)),
                                tap((page) => this.addPage(page)),
                                catchError((err: unknown) => {
                                    logger.error(err);
                                    this.error = err ?? Error('Unknown');
                                    return of(undefined);
                                }),
                                take(1)
                            );
                        } else {
                            return of(undefined);
                        }
                    }),
                    tap(() => (this.busy = false)),
                    takeUntil(this.observeComplete())
                ),
                logger
            );
        }
    }

    private addPage(page: Page<T>): void {
        const newItems = (page.items || []).filter(exists);
        const items = uniqBy(this.items.concat(newItems), 'src');
        if (items.length === this.items.length) {
            // Nothing got added.
            this.emptyCount++;
        }
        items.length = Math.min(items.length, this.maxSize ?? Infinity);
        let atEnd =
            page.atEnd || items.length === this.maxSize || this.emptyCount >= this.maxEmptyCount;
        const pageSize = this.config.pageSize;
        if (
            !atEnd &&
            page.atEnd === undefined &&
            page.total === undefined &&
            pageSize !== undefined
        ) {
            atEnd = page.items.length < pageSize;
        }
        const size = atEnd ? items.length : page.total;
        if (size !== undefined) {
            this.size = Math.min(size, this.maxSize ?? Infinity);
        }
        this.items = items;
    }
}
