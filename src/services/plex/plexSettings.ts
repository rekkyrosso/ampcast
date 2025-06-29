import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged} from 'rxjs';
import {nanoid} from 'nanoid';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaServerSettings from 'types/PersonalMediaServerSettings';
import {LiteStorage, stringContainsMusic} from 'utils';

const storage = new LiteStorage('plex');
const libraryId$ = new BehaviorSubject(storage.getString('libraryId'));

const plexSettings = {
    get accessToken(): string {
        return this.server?.accessToken || '';
    },

    get audioLibraries(): readonly PersonalMediaLibrary[] {
        return this.libraries;
    },

    get clientId(): string {
        let clientId = storage.getString('clientId');
        if (!clientId) {
            clientId = nanoid();
            storage.setString('clientId', clientId);
        }
        return clientId;
    },

    get connection(): plex.Connection | null {
        return storage.getJson('connection');
    },

    set connection(connection: plex.Connection | null) {
        storage.setJson('connection', connection);
    },

    get host(): string {
        return this.connection?.uri || '';
    },

    get internetRequired() {
        if (this.connection?.local) {
            return location.protocol !== 'http:';
        }
        return true;
    },

    get libraryId(): string {
        return storage.getString('libraryId');
    },

    set libraryId(libraryId: string) {
        storage.setString('libraryId', libraryId);
        libraryId$.next(libraryId);
    },

    get libraryTitle(): string {
        const library = this.libraries.find((library) => library.id === this.libraryId);
        return library?.title || '';
    },

    observeLibraryId(): Observable<string> {
        return libraryId$.pipe(distinctUntilChanged());
    },

    get libraries(): readonly PersonalMediaLibrary[] {
        return storage.getJson('libraries') || [];
    },

    set libraries(libraries: readonly PersonalMediaLibrary[]) {
        const library =
            libraries.find((library) => library.id === this.libraryId) ||
            libraries.find((library) => stringContainsMusic(library.title)) ||
            libraries[0];
        storage.setJson('libraries', libraries);
        this.libraryId = library?.id || '';
    },

    get radioDegreesOfSeparation(): number {
        return storage.getNumber('radioDegreesOfSeparation', 1);
    },

    set radioDegreesOfSeparation(degrees: 1 | 2 | 3 | -1) {
        storage.setNumber('radioDegreesOfSeparation', degrees);
    },

    get server(): plex.Device | null {
        return storage.getJson('server');
    },

    set server(server: plex.Device | null) {
        storage.setJson('server', server);
    },

    get serverId(): string {
        return this.server?.clientIdentifier || '';
    },

    get userId(): string {
        return storage.getString('userId');
    },

    set userId(userId: string) {
        storage.setString('userId', userId);
    },

    clear(): void {
        storage.removeItem('userId');
        storage.removeItem('server');
        storage.removeItem('connection');
    },
};

export default plexSettings satisfies PersonalMediaServerSettings;
