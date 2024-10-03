import type {Observable} from 'rxjs';
import {Subscription} from 'rxjs';
import MediaObject from 'types/MediaObject';
import Pager, {Page, PagerConfig} from 'types/Pager';
import SequentialPager from 'services/pagers/SequentialPager';

export interface TidalPage<T> extends Page<T> {
    readonly next?: string | undefined;
}

export default class TidalPager<T extends MediaObject> implements Pager<T> {
    static minPageSize = 20;
    static maxPageSize = 20;

    private readonly pager: SequentialPager<T>;
    private readonly defaultConfig: PagerConfig = {
        pageSize: TidalPager.maxPageSize,
    };
    private readonly config: PagerConfig;
    private subscriptions?: Subscription;

    constructor(fetch: (cursor?: string) => Promise<TidalPage<T>>, options?: Partial<PagerConfig>) {
        this.config = {...this.defaultConfig, ...options};
        let cursor = '';
        this.pager = new SequentialPager<T>(async (): Promise<Page<T>> => {
            const {items, total, next} = await fetch(cursor);
            if (next) {
                try {
                    const params = new URLSearchParams(next.replace(/^[^?]*/, ''));
                    cursor = params.get('page[cursor]') || '';
                    return {items, total, atEnd: !cursor};
                } catch {
                    // Ignore
                }
            }
            return {items, total, atEnd: true};
        }, this.config);
    }

    get maxSize(): number | undefined {
        return this.pager.maxSize;
    }

    observeBusy(): Observable<boolean> {
        return this.pager.observeBusy();
    }

    observeItems(): Observable<readonly T[]> {
        return this.pager.observeItems();
    }

    observeSize(): Observable<number> {
        return this.pager.observeSize();
    }

    observeError(): Observable<unknown> {
        return this.pager.observeError();
    }

    disconnect(): void {
        this.pager.disconnect();
        this.subscriptions?.unsubscribe();
    }

    fetchAt(index: number, length: number): void {
        if (!this.subscriptions) {
            this.connect();
        }

        this.pager.fetchAt(index, length);
    }

    private connect(): void {
        if (!this.subscriptions) {
            this.subscriptions = new Subscription();
        }
    }
}
