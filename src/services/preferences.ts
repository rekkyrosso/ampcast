import type {Observable} from 'rxjs';
import {map, startWith} from 'rxjs';
import {LiteStorage} from 'utils';

export interface Preferences {
    miniPlayer: boolean;
    spacebarTogglePlay: boolean;
}

const storage = new LiteStorage('preferences');

const preferences: Preferences = {
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
    return storage.observeChanges().pipe(
        startWith(undefined),
        map(() => ({...preferences}))
    );
}
