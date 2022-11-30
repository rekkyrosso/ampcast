import type {Observable} from 'rxjs';
import {EMPTY, BehaviorSubject} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';
import Pager from 'types/Pager';

export default class SubjectPager<T> implements Pager<T> {
    protected readonly items$ = new BehaviorSubject<readonly T[]>([]);

    get maxSize(): number | undefined {
        return undefined;
    }

    observeItems(): Observable<readonly T[]> {
        return this.items$;
    }

    observeSize(): Observable<number> {
        return this.observeItems().pipe(
            map((items) => items.length),
            distinctUntilChanged()
        );
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

    next(items: readonly T[]): void {
        this.items$.next(items);
    }

    private get items(): readonly T[] {
        return this.items$.getValue();
    }
}
