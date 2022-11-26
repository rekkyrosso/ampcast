import type {Observable} from 'rxjs';
import {EMPTY, of} from 'rxjs';
import Pager from 'types/Pager';

export default class SimplePager<T> implements Pager<T> {
    constructor(private items: T[] = []) {}

    get maxSize(): number | undefined {
        return undefined;
    }

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
        // do nothing
    }
}
