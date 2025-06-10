import type {Observable} from 'rxjs';
import {map, startWith} from 'rxjs';
import Preferences from 'types/Preferences';
import {LiteStorage} from 'utils';

const storage = new LiteStorage('preferences');

const preferences: Preferences = {
    get albumsOrTracks(): 'albums' | 'tracks' {
        return storage.getString('albumsOrTracks', 'tracks');
    },

    set albumsOrTracks(albumsOrTracks: 'albums' | 'tracks') {
        storage.setString('albumsOrTracks', albumsOrTracks);
    },

    get disableExplicitContent(): boolean {
        return storage.getBoolean('disableExplicitContent');
    },

    set disableExplicitContent(disabled: boolean) {
        storage.setBoolean('disableExplicitContent', disabled);
    },

    get markExplicitContent(): boolean {
        return storage.getBoolean('markExplicitContent');
    },

    set markExplicitContent(enabled: boolean) {
        storage.setBoolean('markExplicitContent', enabled);
    },

    get mediaInfoTabs(): boolean {
        return storage.getBoolean('mediaInfoTabs');
    },

    set mediaInfoTabs(enabled: boolean) {
        storage.setBoolean('mediaInfoTabs', enabled);
    },

    get miniPlayer(): boolean {
        return storage.getBoolean('miniPlayer');
    },

    set miniPlayer(enabled: boolean) {
        storage.setBoolean('miniPlayer', enabled);
    },

    get spacebarTogglePlay(): boolean {
        return storage.getBoolean('spacebarTogglePlay');
    },

    set spacebarTogglePlay(enabled: boolean) {
        storage.setBoolean('spacebarTogglePlay', enabled);
    },
};

export default preferences;

export function observePreferences(): Observable<Readonly<Preferences>> {
    return storage.observeChange().pipe(
        startWith(undefined),
        map(() => ({...preferences}))
    );
}
