import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged} from 'rxjs';
import {nanoid} from 'nanoid';
import {LiteStorage} from 'utils';

interface JellyfinLibrary {
    readonly id: string;
    readonly title: string;
}

const storage = new LiteStorage('jellyfin');
const libraryId$ = new BehaviorSubject(storage.getString('libraryId'));

export default {
    get host(): string {
        return storage.getString('host');
    },

    set host(host: string) {
        storage.setString('host', host);
    },

    get device(): string {
        return 'PC';
    },

    get deviceId(): string {
        let deviceId = storage.getString('deviceId');
        if (!deviceId) {
            deviceId = nanoid();
            storage.setString('deviceId', deviceId);
        }
        return deviceId;
    },

    get libraryId(): string {
        return storage.getString('libraryId');
    },

    set libraryId(libraryId: string) {
        storage.setString('libraryId', libraryId);
        libraryId$.next(libraryId);
    },

    observeLibraryId(): Observable<string> {
        return libraryId$.pipe(distinctUntilChanged());
    },

    get libraries(): JellyfinLibrary[] {
        return storage.getJson('libraries') || [];
    },

    set libraries(libraries: readonly JellyfinLibrary[]) {
        storage.setJson(
            'libraries',
            libraries.map(({id, title}) => ({id, title}))
        );
    },

    get serverId(): string {
        return storage.getString('serverId');
    },

    set serverId(serverId: string) {
        storage.setString('serverId', serverId);
    },

    get token(): string {
        return storage.getString('token');
    },

    set token(token: string) {
        storage.setString('token', token);
    },

    get userId(): string {
        return storage.getString('userId');
    },

    set userId(userId: string) {
        storage.setString('userId', userId);
    },

    clear(): void {
        storage.removeItem('serverId');
        storage.removeItem('userId');
        storage.removeItem('token');
    },
};
