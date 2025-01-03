import type {Observable} from 'rxjs';
import {NEVER, of} from 'rxjs';
import Pager from 'types/Pager';

export default class ErrorPager<T> implements Pager<T> {
    readonly pageSize = 0;

    constructor(private readonly error: unknown) {}

    observeBusy(): Observable<boolean> {
        return of(false);
    }

    observeItems(): Observable<readonly T[]> {
        return NEVER;
    }

    observeSize(): Observable<number> {
        return NEVER;
    }

    observeError(): Observable<unknown> {
        return of(this.error);
    }

    fetchAt(): void {
        // do nothing
    }

    disconnect(): void {
        // do nothing
    }
}
