import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged} from 'rxjs';
import {nanoid} from 'nanoid';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaLibrarySettings from 'types/PersonalMediaLibrarySettings';
import StreamingQuality from 'types/StreamingQuality';
import {LiteStorage, stringContainsMusic} from 'utils';

const storage = new LiteStorage('plex');
const libraryId$ = new BehaviorSubject(storage.getString('libraryId'));

const plexSettings = {
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

    get drm(): string {
        return storage.getString('drm', 'widevine');
    },

    set drm(drm: string) {
        storage.setString('drm', drm);
    },

    get connection(): plex.Connection | null {
        return storage.getJson('connection');
    },

    set connection(connection: plex.Connection | null) {
        storage.setJson('connection', connection);
    },

    get hasTidal(): boolean {
        return storage.getBoolean('hasTidal');
    },

    set hasTidal(hasTidal: boolean) {
        storage.setBoolean('hasTidal', hasTidal);
    },

    get host(): string {
        return this.connection?.uri || '';
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

    get libraries(): PersonalMediaLibrary[] {
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

    get server(): plex.Device | null {
        return storage.getJson('server');
    },

    set server(server: plex.Device | null) {
        storage.setJson('server', server);
    },

    get serverToken(): string {
        return this.server?.accessToken || '';
    },

    get streamingQuality(): StreamingQuality {
        return storage.getNumber('streamingQuality', StreamingQuality.Lossless);
    },

    set streamingQuality(streamingQuality: StreamingQuality) {
        storage.setNumber('streamingQuality', streamingQuality);
    },

    get userToken(): string {
        return storage.getString('userToken');
    },

    set userToken(token: string) {
        storage.setString('userToken', token);
    },

    get userId(): string {
        return storage.getString('userId');
    },

    set userId(userId: string) {
        storage.setString('userId', userId);
    },

    clear(): void {
        storage.removeItem('userId');
        storage.removeItem('userToken');
        storage.removeItem('server');
        storage.removeItem('connection');
        storage.removeItem('hasTidal');
    },
};

export default plexSettings satisfies PersonalMediaLibrarySettings;
