import type {Observable} from 'rxjs';

export default interface Pager<T> {
    readonly maxSize: number | undefined;
    observeItems(): Observable<readonly T[]>;
    observeSize(): Observable<number>;
    observeError(): Observable<unknown>;
    fetchAt(index: number, length?: number): void;
    disconnect(): void;
}

export interface PagerConfig {
    readonly pageSize?: number;
    readonly maxSize?: number;
    readonly noCache?: boolean; // disable caching (implementation specific)
    readonly calculatePageSize?: boolean;
    // The following only apply if `calculatePageSize` is set.
    readonly minPageSize?: number;
    readonly maxPageSize?: number;
    readonly lookup?: boolean; // lookup only
}

export interface Page<T> {
    readonly items: readonly T[];
    readonly total?: number;
    readonly atEnd?: boolean;
}
