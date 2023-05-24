import type {Observable} from 'rxjs';
import {BehaviorSubject, filter, map} from 'rxjs';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import {LiteStorage} from 'utils';

type HiddenSettings = Record<string, boolean | undefined>;

const storage = new LiteStorage('services');
const initialHiddenSettings = storage.getJson('hidden', {});
const hidden$ = new BehaviorSubject<HiddenSettings>(initialHiddenSettings);

export function observeHiddenServiceChanges(): Observable<void> {
    return hidden$.pipe(
        filter((settings) => settings !== initialHiddenSettings),
        map(() => undefined)
    );
}

export function isHidden(source: MediaService | MediaSource<any>): boolean {
    const settings = hidden$.getValue();
    return settings[source.id] ?? !!source.defaultHidden;
}

export function isVisible(source: MediaService | MediaSource<any>): boolean {
    return !isHidden(source);
}

export function setHidden(updates: Record<string, boolean>): void {
    const settings = hidden$.getValue();
    const newSettings = {...settings, ...updates};
    storage.setJson('hidden', newSettings);
    hidden$.next(newSettings);
}

export default {
    observeHiddenServiceChanges,
    isHidden,
    setHidden,
};
