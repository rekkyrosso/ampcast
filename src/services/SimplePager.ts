import type {Observable} from 'rxjs';
import {EMPTY, of} from 'rxjs';
import Pager from 'types/Pager';

export default class SimplePager<T> implements Pager<T> {
    constructor(private items: T[] = []) {}

    get size(): number {
        return this.items.length;
    }

    observeComplete(): Observable<readonly T[]> {
        return of(this.items);
    }

    observeItems(): Observable<readonly T[]> {
        return of(this.items);
    }

    observeSize(): Observable<number> {
        return of(this.items.length);
    }

    observeMaxSize(): Observable<number> {
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
