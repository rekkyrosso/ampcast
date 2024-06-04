import {catchError, filter, map, mergeMap, of, takeUntil, throttleTime} from 'rxjs';
import MediaObject from 'types/MediaObject';
import {Page, PagerConfig} from 'types/Pager';
import {Logger} from 'utils';
import AbstractPager from './AbstractPager';

enum FetchState {
    Pending,
    Fulfilled,
    Rejected,
}

const logger = new Logger('OffsetPager');

export default class OffsetPager<T extends MediaObject> extends AbstractPager<T> {
    private readonly fetchStates: Record<number, FetchState> = {};

    constructor(
        private readonly fetch: (pageNumber: number, pageSize: number) => Promise<Page<T>>,
        options?: Partial<PagerConfig>
    ) {
        super(options);
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();

            // TODO: better error handling.
            this.subscribeTo(
                this.observeFetches().pipe(
                    throttleTime(200, undefined, {leading: false, trailing: true}),
                    filter(({index, length}) => length > 0 && this.isInRange(index)),
                    map(({index, length}) => this.getPageNumbersFromIndex(index, length)),
                    mergeMap((pageNumbers) => pageNumbers),
                    mergeMap((pageNumber) => this.fetchPage(pageNumber)),
                    catchError((err: unknown) => {
                        logger.error(err);
                        this.error = err;
                        return of(undefined);
                    }),
                    takeUntil(this.observeComplete())
                ),
                logger
            );
        }
    }

    private get pageSize(): number {
        return this.config.pageSize || 20;
    }

    private async fetchPage(pageNumber: number): Promise<void> {
        if (
            this.fetchStates[pageNumber] === FetchState.Fulfilled ||
            this.fetchStates[pageNumber] === FetchState.Pending
        ) {
            return;
        }

        this.fetchStates[pageNumber] = FetchState.Pending;

        try {
            const page = await this.fetch(pageNumber, this.pageSize);
            this.fetchStates[pageNumber] = FetchState.Fulfilled;
            this.insertPage(pageNumber, page);
        } catch (err: unknown) {
            this.fetchStates[pageNumber] = FetchState.Rejected;
            throw err;
        }
    }

    private insertPage(pageNumber: number, page: Page<T>): void {
        const items = this.items.slice(); // copy
        const size = Math.min(page.total!, this.maxSize ?? Infinity);

        const pageCount = Math.ceil(size / this.pageSize);
        const offset = (pageNumber - 1) * this.pageSize;

        page.items.forEach((item, index) => (items[index + offset] = item));
        items.length = size; // sparse array

        if (page.items.length === size) {
            for (let i = 0; i <= pageCount; i++) {
                this.fetchStates[i + 1] = FetchState.Fulfilled;
            }
        }

        this.size = size;
        this.items = items;
    }

    private getPageNumbersFromIndex(index: number, length: number): number[] {
        const size = this.size || 0;
        const proximity = Math.max(Math.ceil(this.pageSize / 2), length);
        const startIndex = Math.max(index - proximity, 0);
        const lastIndex = Math.min(
            index + proximity + length - 1,
            size === 0 ? (this.maxSize ? this.maxSize - 1 : Infinity) : size - 1
        );
        const firstPageNumber = this.getPageNumberFromIndex(startIndex);
        const lastPageNumber = this.getPageNumberFromIndex(lastIndex);

        if (firstPageNumber === lastPageNumber) {
            return [firstPageNumber];
        } else {
            const pageNumbers: number[] = [];
            for (let pageNumber = firstPageNumber; pageNumber <= lastPageNumber; pageNumber++) {
                pageNumbers.push(pageNumber);
            }
            return pageNumbers;
        }
    }

    private getPageNumberFromIndex(index: number): number {
        return Math.floor(index / this.pageSize) + 1;
    }

    private isInRange(index: number): boolean {
        const size = this.size || 0;
        return size === 0 ? index >= 0 : index >= 0 && index < size;
    }
}
