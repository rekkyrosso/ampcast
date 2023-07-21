import type {Observable} from 'rxjs';
import {EMPTY, of} from 'rxjs';
import Pager from 'types/Pager';

export default class SimplePager<T> implements Pager<T> {
    readonly maxSize = undefined;

    constructor(private readonly items: readonly T[] = []) {}

    observeItems(): Observable<readonly T[]> {
        return of(this.items);
    }

    observeSize(): Observable<number> {
        return of(this.items.length);
    }

    observeError(): Observable<unknown> {
        return EMPTY;
    }

    fetchAt(): void {
        // do nothing
    }

    disconnect(): void {
        this.items.forEach((item) => (item as any).pager?.disconnect());
    }
}
