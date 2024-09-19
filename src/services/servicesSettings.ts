import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, map, skipWhile} from 'rxjs';
import MediaSource from 'types/MediaSource';
import {LiteStorage} from 'utils';

type AnyMediaSource = Pick<MediaSource<any>, 'id' | 'defaultHidden'>;
type HiddenSettings = Record<string, boolean | undefined>;

const storage = new LiteStorage('services');
const initialHiddenSettings = storage.getJson<HiddenSettings>('hidden', {});
const hidden$ = new BehaviorSubject(initialHiddenSettings);

export const allowMultiSelect = !__single_streaming_service__ || storage.getBoolean('multiSelect');

export function observeVisibilityChanges(): Observable<void> {
    return hidden$.pipe(
        skipWhile((settings) => settings === initialHiddenSettings),
        map(() => undefined)
    );
}

export function observeSourceVisibility(source: AnyMediaSource): Observable<boolean> {
    return hidden$.pipe(
        map(() => isSourceVisible(source)),
        distinctUntilChanged()
    );
}

export function isSourceHidden(source: AnyMediaSource): boolean {
    const settings = hidden$.getValue();
    return settings[source.id] ?? !!source.defaultHidden;
}

export function isSourceVisible(source: AnyMediaSource): boolean {
    return !isSourceHidden(source);
}

export function setHiddenSources(updates: Record<string, boolean>): void {
    const settings = hidden$.getValue();
    const newSettings = {...settings, ...updates};
    storage.setJson('hidden', newSettings);
    hidden$.next(newSettings);
}
