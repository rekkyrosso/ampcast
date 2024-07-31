import type {Observable} from 'rxjs';
import {map, startWith} from 'rxjs';
import {LiteStorage} from 'utils';

export interface Preferences {
    miniPlayer: boolean;
    spacebarToggle: boolean;
}

const storage = new LiteStorage('preferences');

const preferences = {
    get miniPlayer(): boolean {
        return storage.getBoolean('miniPlayer');
    },

    set miniPlayer(enabled: boolean) {
        storage.setBoolean('miniPlayer', enabled);
    },

    get spacebarToggle(): boolean {
        return storage.getBoolean('spacebarToggle');
    },

    set spacebarToggle(enabled: boolean) {
        storage.setBoolean('spacebarToggle', enabled);
    },
};

export default preferences;

export function observePreferences(): Observable<Readonly<Preferences>> {
    return storage.observeChanges().pipe(
        startWith(undefined),
        map(() => ({...preferences}))
    );
}
