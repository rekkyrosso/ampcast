import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, map, skipWhile} from 'rxjs';
import MediaSearchParams from 'types/MediaSearchParams';
import MediaSource from 'types/MediaSource';
import {LiteStorage} from 'utils';

type Sorting = Required<Pick<MediaSearchParams, 'sortBy' | 'sortOrder'>>;
type AnyMediaSource = Pick<MediaSource<any>, 'id' | 'defaultHidden' | 'defaultSort'>;
type HiddenSettings = Record<string, boolean | undefined>;
type SortingSettings = Record<string, Sorting | undefined>;

const storage = new LiteStorage('services');
const initialHiddenSettings = storage.getJson<HiddenSettings>('hidden', {});
const initialSortingSettings = storage.getJson<SortingSettings>('sorting', {});
const hidden$ = new BehaviorSubject(initialHiddenSettings);
const sorting$ = new BehaviorSubject(initialSortingSettings);

export const allowMultiSelect = !__single_streaming_service__ || storage.getBoolean('multiSelect');

export function observeVisibilityChanges(): Observable<void> {
    return hidden$.pipe(
        skipWhile((settings) => settings === initialHiddenSettings),
        map(() => undefined)
    );
}

export function observeSourceSorting(source: AnyMediaSource): Observable<Sorting> {
    return sorting$.pipe(
        map(() => getSourceSorting(source)),
        distinctUntilChanged()
    );
}

export function observeSourceVisibility(source: AnyMediaSource): Observable<boolean> {
    return hidden$.pipe(
        map(() => isSourceVisible(source)),
        distinctUntilChanged()
    );
}

export function isSourceHidden(source: AnyMediaSource): boolean {
    const settings = hidden$.value;
    return settings[source.id] ?? !!source.defaultHidden;
}

export function isSourceVisible(source: AnyMediaSource): boolean {
    return !isSourceHidden(source);
}

export function getHiddenSources(): HiddenSettings {
    return hidden$.value;
}

export function setHiddenSources(updates: Record<string, boolean>): void {
    const settings = hidden$.value;
    const newSettings = {...settings, ...updates};
    storage.setJson('hidden', newSettings);
    hidden$.next(newSettings);
}

export function getSourceSorting(source: AnyMediaSource): Sorting {
    const settings = sorting$.value;
    return settings[source.id] ?? source.defaultSort ?? {sortBy: '', sortOrder: 1};
}

export function setSourceSorting(
    source: AnyMediaSource,
    sortBy: Sorting['sortBy'],
    sortOrder: Sorting['sortOrder']
): void {
    const settings = sorting$.value;
    const newSettings = {...settings, ...{[source.id]: {sortBy, sortOrder}}};
    storage.setJson('sorting', newSettings);
    sorting$.next(newSettings);
}
