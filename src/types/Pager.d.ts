import type {Observable} from 'rxjs';
import {ConditionalKeys} from 'type-fest';
import SortParams from './SortParams';

export default interface Pager<T> {
    readonly pageSize: number;
    readonly maxSize?: number | undefined;
    observeBusy: () => Observable<boolean>;
    observeComplete: () => Observable<void>;
    observeItems(): Observable<readonly T[]>;
    observeSize(): Observable<number>;
    observeError(): Observable<unknown>;
    fetchAt(index: number, length?: number): void;
    disconnect(): void;
    addItems?(items: readonly T[], atIndex?: number): void;
    moveItems?(items: readonly T[], toIndex: number): void;
    removeItems?(items: readonly T[]): void;
    activate?(): void;
    deactivate?(): void;
}

// TODO: This is really `MediaPagerConfig`.
export interface PagerConfig<T = any> {
    readonly pageSize: number;
    readonly maxSize?: number;
    readonly itemKey?: ConditionalKeys<T, string | number>;
    readonly passive?: boolean; // lookup only (no background fetching)
    readonly noCache?: boolean; // disable caching (implementation specific)
    readonly childSort?: SortParams;
    readonly childSortId?: string;
    readonly autofill?: boolean;
    readonly autofillInterval?: number;
    readonly autofillMaxPages?: number;
}

export interface Page<T> {
    readonly items: readonly T[];
    readonly total?: number;
    readonly atEnd?: boolean;
}
