import type {Observable} from 'rxjs';
import {EMPTY, of} from 'rxjs';
import MediaObject from 'types/MediaObject';
import AbstractPager from './AbstractPager';

export default class SimpleMediaPager<T extends MediaObject> extends AbstractPager<T> {
    constructor(items: readonly T[] = []) {
        super();
        this.items$.next(items);
    }

    get maxSize(): number | undefined {
        return undefined;
    }

    observeSize(): Observable<number> {
        return of(this.items.length);
    }

    observeError(): Observable<unknown> {
        return EMPTY;
    }

    fetchAt(): void {
        if (!this.subscriptions) {
            this.connect();
        }
    }

    disconnect(): void {
        super.disconnect();
        this.items.forEach((item) => (item as any).pager?.disconnect());
    }
}
