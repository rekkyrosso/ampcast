import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, map, skipWhile} from 'rxjs';
import MediaListLayout, {Field} from 'types/MediaListLayout';
import SortParams from 'types/SortParams';
import MediaSource from 'types/MediaSource';
import {LiteStorage} from 'utils';
import {isMediaService} from './mediaServices';
import {isStartupService} from './buildConfig';

type AnyMediaSource = Pick<MediaSource<any>, 'id' | 'defaultHidden'>;
type FieldsSettings = Record<string, readonly Field[] | undefined>;
type HiddenSettings = Record<string, boolean | undefined>;
type SortingSettings = Record<string, SortParams | undefined>;
type ViewSettings = Record<string, MediaListLayout['view'] | undefined>;

const storage = new LiteStorage('services');
const initialFieldsSettings = storage.getJson<FieldsSettings>('fields', {});
const initialHiddenSettings = storage.getJson<HiddenSettings>('hidden', {});
const initialSortingSettings = storage.getJson<SortingSettings>('sorting', {});
const initialViewSettings = storage.getJson<ViewSettings>('view', {});
const fields$ = new BehaviorSubject(initialFieldsSettings);
const hidden$ = new BehaviorSubject(initialHiddenSettings);
const sorting$ = new BehaviorSubject(initialSortingSettings);
const view$ = new BehaviorSubject(initialViewSettings);

export const allowMultiSelect = !__single_streaming_service__ || storage.getBoolean('multiSelect');

export function observeVisibilityChanges(): Observable<void> {
    return hidden$.pipe(
        skipWhile((settings) => settings === initialHiddenSettings),
        map(() => undefined)
    );
}

export function observeSourceFields(id: string): Observable<readonly Field[] | undefined> {
    return fields$.pipe(
        map(() => getSourceFields(id)),
        distinctUntilChanged()
    );
}

export function observeSourceView(id: string): Observable<MediaListLayout['view'] | undefined> {
    return view$.pipe(
        map(() => getSourceView(id)),
        distinctUntilChanged()
    );
}

export function observeSourceSorting(id: string): Observable<SortParams | undefined> {
    return sorting$.pipe(
        map(() => getSourceSorting(id)),
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
    const defaultHidden = isMediaService(source)
        ? !isStartupService(source.id)
        : !!source.defaultHidden;
    return settings[source.id] ?? defaultHidden;
}

export function isSourceVisible(source: AnyMediaSource): boolean {
    return !isSourceHidden(source);
}

export function getHiddenSources(): HiddenSettings {
    return hidden$.value;
}

export function getSourceFields(id: string): readonly Field[] | undefined {
    return fields$.value[id];
}

export function getSourceSorting(id: string): SortParams | undefined {
    return sorting$.value[id];
}

export function getSourceView(id: string): MediaListLayout['view'] | undefined {
    return view$.value[id];
}

export function setHiddenSources(updates: Record<string, boolean>): void {
    const settings = hidden$.value;
    const newSettings = {...settings, ...updates};
    storage.setJson('hidden', newSettings);
    hidden$.next(newSettings);
}

export function setSourceFields(id: string, fields: readonly Field[]): void {
    const settings = fields$.value;
    const newSettings = {...settings, ...{[id]: fields}};
    storage.setJson('fields', newSettings);
    fields$.next(newSettings);
}

export function setSourceSorting(
    id: string,
    sortBy: SortParams['sortBy'],
    sortOrder: SortParams['sortOrder']
): void {
    const settings = sorting$.value;
    const newSettings = {...settings, ...{[id]: {sortBy, sortOrder}}};
    storage.setJson('sorting', newSettings);
    sorting$.next(newSettings);
}

export function setSourceView(id: string, view: MediaListLayout['view']): void {
    const settings = view$.value;
    const newSettings = {...settings, ...{[id]: view}};
    storage.setJson('view', newSettings);
    view$.next(newSettings);
}
