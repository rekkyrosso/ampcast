import {catchError, concatMap, delayWhen, mergeMap, of, take, takeUntil, tap, timer} from 'rxjs';
import MediaObject from 'types/MediaObject';
import {Page, PagerConfig} from 'types/Pager';
import {exists, Logger, uniqBy} from 'utils';
import MediaPager, {CreateChildPager} from './MediaPager';

const logger = new Logger('SequentialPager');

export default class SequentialPager<T extends MediaObject> extends MediaPager<T> {
    private readonly maxFetchCount = 100;
    private readonly maxEmptyCount = 2;
    private fetchCount = 0;
    private emptyCount = 0;

    constructor(
        private readonly _fetchNext: (pageSize: number) => Promise<Page<T>>,
        config: PagerConfig<T>,
        createChildPager?: CreateChildPager<T>
    ) {
        super(config, createChildPager);
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();

            this.subscribeTo(
                this.observeFetches().pipe(
                    concatMap(({index, length}) => {
                        if (
                            index + length + 2 >= this.items.length &&
                            this.fetchCount < this.maxFetchCount
                        ) {
                            this.fetchCount++;
                            return of(undefined).pipe(
                                tap(() => (this.busy = true)),
                                mergeMap(() => this._fetchNext(this.config.pageSize)),
                                tap({
                                    next: (page) => {
                                        this.error = undefined;
                                        this.addPage(page);
                                        if (
                                            !this.disconnected &&
                                            index + 1 < (this.size ?? this.maxSize ?? Infinity) &&
                                            index + length + 2 >= this.items.length
                                        ) {
                                            this.fetchAt(index, length);
                                        }
                                    },
                                }),
                                catchError((err: unknown) => {
                                    logger.error(err);
                                    this.error = err ?? Error('Unknown');
                                    return of(undefined);
                                }),
                                take(1),
                                tap(() => (this.busy = false)),
                                delayWhen(() => (this.error ? timer(5000) : of(0)))
                            );
                        } else {
                            return of(undefined);
                        }
                    }),
                    takeUntil(this.observeComplete())
                ),
                logger
            );
        }
    }

    private addPage(page: Page<T>): void {
        const newItems = (page.items || []).filter(exists);
        const items = uniqBy(this.itemKey, this.items.concat(newItems));
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
