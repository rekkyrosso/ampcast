import type {Observable} from 'rxjs';
import {BehaviorSubject, NEVER, map} from 'rxjs';
import Pager from 'types/Pager';

export default class SimplePager<T> implements Pager<T> {
    private readonly items$ = new BehaviorSubject<readonly T[]>([]);
    readonly maxSize = undefined;

    constructor(items: readonly T[] = []) {
        this.items$.next(items);
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

    private get items(): readonly T[] {
        return this.items$.getValue();
    }
}
