import type {Observable} from 'rxjs';

export default interface Pager<T> {
    observeComplete(): Observable<readonly T[]>;
    observeItems(): Observable<readonly T[]>;
    observeSize(): Observable<number>;
    observeMaxSize(): Observable<number>;
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
}

export interface PageFetch {
    readonly index: number;
    readonly length: number;
}

export interface Page<T> {
    readonly items: readonly T[];
    readonly total?: number;
    readonly atEnd?: boolean;
}
