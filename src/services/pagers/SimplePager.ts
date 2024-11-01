import type {Observable} from 'rxjs';
import {NEVER, BehaviorSubject, map, of} from 'rxjs';
import Pager from 'types/Pager';

export default class SimplePager<T> implements Pager<T> {
    private readonly items$ = new BehaviorSubject<readonly T[]>(this.items);

    constructor(private readonly items: readonly T[] = []) {}

    observeBusy(): Observable<boolean> {
        return of(false);
    }

    observeItems(): Observable<readonly T[]> {
        return this.items$;
    }

    observeSize(): Observable<number> {
        return this.items$.pipe(map((items) => items.length));
    }

    observeError(): Observable<unknown> {
        return NEVER;
    }

    fetchAt(): void {
        // do nothing
    }

    disconnect(): void {
        this.items.forEach((item) => (item as any)?.pager?.disconnect());
    }
}
