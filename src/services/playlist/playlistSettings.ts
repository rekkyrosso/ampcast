import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import LiteStorage from 'utils/LiteStorage';

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

function getSavedSettings(): PlaylistSettings {
    try {
        const json = storage.getItem('settings');
        const settings = json ? JSON.parse(json) : defaultSettings;
        return settings;
    } catch (err) {
        console.error(err);
        return defaultSettings;
    }
}

const settings$ = new BehaviorSubject<PlaylistSettings>(getSavedSettings());

function observe(): Observable<PlaylistSettings> {
    return settings$;
}

function get(): PlaylistSettings {
    return settings$.getValue();
}

function set(settings: PlaylistSettings): void {
    storage.setItem('settings', JSON.stringify(settings));
    settings$.next(settings);
}

export default {
    observe,
    get,
    set,
};
