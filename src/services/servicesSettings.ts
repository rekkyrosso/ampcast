import type {Observable} from 'rxjs';
import {BehaviorSubject, map, skipWhile} from 'rxjs';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import {LiteStorage} from 'utils';

type HiddenSettings = Record<string, boolean | undefined>;

const storage = new LiteStorage('services');
const initialHiddenSettings = storage.getJson<HiddenSettings>('hidden', {});
const hidden$ = new BehaviorSubject(initialHiddenSettings);

export const allowAllServices = storage.getBoolean('allowAll');

export function observeHiddenSourceChanges(): Observable<void> {
    return hidden$.pipe(
        skipWhile((settings) => settings === initialHiddenSettings),
        map(() => undefined)
    );
}

export function isSourceHidden(source: MediaService | MediaSource<any>): boolean {
    const settings = hidden$.getValue();
    return settings[source.id] ?? !!source.defaultHidden;
}

export function isSourceVisible(source: MediaService | MediaSource<any>): boolean {
    return !isSourceHidden(source);
}

export function setHiddenSources(updates: Record<string, boolean>): void {
    const settings = hidden$.getValue();
    const newSettings = {...settings, ...updates};
    storage.setJson('hidden', newSettings);
    hidden$.next(newSettings);
}
