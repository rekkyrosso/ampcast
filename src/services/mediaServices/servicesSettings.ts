import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, map, skipWhile, startWith} from 'rxjs';
import MediaListLayout, {Field} from 'types/MediaListLayout';
import SortParams from 'types/SortParams';
import MediaService from 'types/MediaService';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource from 'types/MediaSource';
import {LiteStorage} from 'utils';
import {isMediaService} from './mediaServices';
import {isStartupService} from './buildConfig';

type AnyMediaSource = Pick<MediaSource<any>, 'id' | 'defaultHidden'>;
type FieldsSettings = Record<string, readonly Field[] | undefined>;
type HiddenSettings = Record<string, boolean | undefined>;
type SortingSettings = Record<string, SortParams | undefined>;
type ViewSettings = Record<string, MediaListLayout['view'] | undefined>;

const key_fields = 'fields2';
const key_hidden = 'hidden';
const key_sorting = 'sorting2';
const key_view = 'view';

export function getServicesSettingsKeys(): readonly string[] {
    return [key_hidden, key_sorting].map((key) => `services/${key}`);
}

export function getServicesLayoutSettingsKeys(): readonly string[] {
    return [key_view, key_fields].map((key) => `services/${key}`);
}

const storage = new LiteStorage('services');

const initialFieldsSettings = storage.getJson<FieldsSettings>(key_fields, {});
const initialHiddenSettings = storage.getJson<HiddenSettings>(key_hidden, {});
const initialSortingSettings = storage.getJson<SortingSettings>(key_sorting, {});
const initialViewSettings = storage.getJson<ViewSettings>(key_view, {});
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

export function observeScrobblingEnabled(): Observable<boolean> {
    return observeVisibilityChanges().pipe(
        map(() => isScrobblingEnabled()),
        startWith(isScrobblingEnabled()),
        distinctUntilChanged()
    );
}

export function isScrobblingEnabled(): boolean {
    return isServiceVisible('lastfm') || isServiceVisible('listenbrainz');
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

let propagateSortingChange = true;

export function observeSourceSorting(id: string): Observable<SortParams | undefined> {
    return sorting$.pipe(
        map(() => getSourceSorting(id)),
        distinctUntilChanged(),
        filter(() => propagateSortingChange)
    );
}

export function observeSourceVisibility(source: AnyMediaSource): Observable<boolean> {
    return hidden$.pipe(
        map(() => isSourceVisible(source)),
        distinctUntilChanged()
    );
}

export function isServiceHidden(service: MediaService | MediaServiceId): boolean {
    const id = typeof service === 'string' ? service : service.id;
    const settings = hidden$.value;
    return settings[id] ?? !isStartupService(id);
}

export function isServiceVisible(service: MediaService | MediaServiceId): boolean {
    return !isServiceHidden(service);
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
    storage.setJson(key_hidden, newSettings);
    hidden$.next(newSettings);
}

export function setSourceFields(id: string, fields: readonly Field[]): void {
    const settings = fields$.value;
    const newSettings = {...settings, ...{[id]: fields}};
    storage.setJson(key_fields, newSettings);
    fields$.next(newSettings);
}

export function setSourceSorting(
    id: string,
    params: SortParams | undefined,
    silent?: boolean
): void {
    const settings = sorting$.value;
    const newSettings = {...settings, ...{[id]: params}};
    storage.setJson(key_sorting, newSettings);
    propagateSortingChange = !silent;
    sorting$.next(newSettings);
    propagateSortingChange = true;
}

export function setSourceView(id: string, view: MediaListLayout['view']): void {
    const settings = view$.value;
    const newSettings = {...settings, ...{[id]: view}};
    storage.setJson(key_view, newSettings);
    view$.next(newSettings);
}
