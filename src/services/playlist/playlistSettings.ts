import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';

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
        const json = localStorage.getItem('playlist/settings');
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
    localStorage.setItem('playlist/settings', JSON.stringify(settings));
    settings$.next(settings);
}

export default {
    observe,
    get,
    set,
};
