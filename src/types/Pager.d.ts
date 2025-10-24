import type {Observable} from 'rxjs';
import SortParams from './SortParams';

export default interface Pager<T> {
    readonly pageSize: number;
    readonly maxSize?: number | undefined;
    observeBusy: () => Observable<boolean>;
    observeItems(): Observable<readonly T[]>;
    observeSize(): Observable<number>;
    observeError(): Observable<unknown>;
    fetchAt(index: number, length?: number): void;
    disconnect(): void;
}

export interface PagerConfig {
    readonly pageSize: number;
    readonly maxSize?: number;
    readonly lookup?: boolean; // lookup only (no background fetching)
    readonly ignoreMetadataChanges?: boolean;
    readonly noCache?: boolean; // disable caching (implementation specific)
    readonly childSort?: SortParams;
    readonly childSortId?: string;
}

export interface Page<T> {
    readonly items: readonly T[];
    readonly total?: number;
    readonly atEnd?: boolean;
}
