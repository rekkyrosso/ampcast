import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {LiteStorage} from 'utils';

const storage = new LiteStorage('playlist');

export interface PlaylistSettings {
    allowDuplicates: boolean;
    showLineNumbers: boolean;
    zeroPadLineNumbers: boolean;
    showSourceIcons: boolean;
}

const defaultSettings: PlaylistSettings = {
    allowDuplicates: true,
    showLineNumbers: true,
    zeroPadLineNumbers: true,
    showSourceIcons: true,
};

const settings$ = new BehaviorSubject<PlaylistSettings>(
    storage.getJson('settings', defaultSettings)
);

function observe(): Observable<PlaylistSettings> {
    return settings$;
}

function get(): PlaylistSettings {
    return settings$.getValue();
}

function set(settings: PlaylistSettings): void {
    storage.setJson('settings', settings);
    settings$.next(settings);
}

export default {
    observe,
    get,
    set,
};
