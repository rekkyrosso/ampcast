import {
    EMPTY,
    catchError,
    concatMap,
    debounceTime,
    delay,
    filter,
    map,
    mergeMap,
    of,
    startWith,
    switchMap,
    take,
    takeUntil,
} from 'rxjs';
import MediaObject from 'types/MediaObject';
import {Page, PagerConfig} from 'types/Pager';
import {exists, Logger} from 'utils';
import MediaPager, {CreateChildPager} from './MediaPager';

enum FetchState {
    Pending,
    Fulfilled,
    Rejected,
}

const logger = new Logger('IndexedPager');

export default class IndexedPager<T extends MediaObject> extends MediaPager<T> {
    private readonly fetchStates = new Map<number, FetchState>();

    constructor(
        private readonly _fetch: (pageNumber: number, pageSize: number) => Promise<Page<T>>,
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
                    filter(({index, length}) => length > 0 && this.isInRange(index)),
                    debounceTime(200),
                    map(({index, length}) => this.getPageNumbersFromIndex(index, length)),
                    mergeMap((pageNumbers) => pageNumbers),
                    mergeMap((pageNumber) => this.fetchPage(pageNumber)),
                    catchError((err: unknown) => {
                        logger.error(err);
                        this.error = err ?? Error('Unknown');
                        return of(undefined);
                    }),
                    takeUntil(this.observeComplete())
                ),
                logger
            );

            if (this.config.autofill) {
                this.subscribeTo(
                    this.observeActive().pipe(
                        switchMap((active) =>
                            active ? this.observeAdditions().pipe(startWith([])) : EMPTY
                        ),
                        delay(this.config.autofillInterval || 0),
                        map(() => this.getPageNumbersFromIndex(0, this.size!)),
                        map(
                            (pageNumbers) =>
                                pageNumbers.filter(
                                    (pageNumber) => this.fetchStates.get(pageNumber) === undefined
                                )[0]
                        ),
                        filter(exists),
                        concatMap((pageNumber) => this.fetchPage(pageNumber)),
                        take(this.config.autofillMaxPages || this.defaultAutofillMaxPages),
                        takeUntil(this.observeComplete())
                    ),
                    logger
                );
            }
        }
    }

    private get isFetching(): boolean {
        for (const fetchState of this.fetchStates.values()) {
            if (fetchState === FetchState.Pending) {
                return true;
            }
        }
        return false;
    }

    private async fetchPage(pageNumber: number): Promise<void> {
        if (
            this.fetchStates.get(pageNumber) === FetchState.Fulfilled ||
            this.fetchStates.get(pageNumber) === FetchState.Pending
        ) {
            return;
        }

        this.fetchStates.set(pageNumber, FetchState.Pending);

        try {
            this.busy = true;
            this.error = undefined;
            const page = await this._fetch(pageNumber, this.pageSize);
            this.fetchStates.set(pageNumber, FetchState.Fulfilled);
            this.insertPage(pageNumber, page);
            this.busy = this.isFetching;
        } catch (err: unknown) {
            this.fetchStates.set(pageNumber, FetchState.Rejected);
            this.busy = this.isFetching;
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
                this.fetchStates.set(i + 1, FetchState.Fulfilled);
            }
        }

        this.size = size;
        this.items = items;
    }

    private getPageNumbersFromIndex(index: number, length: number): number[] {
        if (index === 0 && length === this.pageSize) {
            return [1];
        }
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
