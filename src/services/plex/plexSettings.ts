import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged} from 'rxjs';
import {nanoid} from 'nanoid';
import {LiteStorage} from 'utils';

type PlexSection = Pick<plex.Directory, 'key' | 'title'>;

const storage = new LiteStorage('plex');
const libraryId$ = new BehaviorSubject(storage.getString('libraryId'));

export default {
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

    get sections(): PlexSection[] {
        return storage.getJson('sections') || [];
    },

    set sections(sections: PlexSection[]) {
        storage.setJson(
            'sections',
            sections.map(({key, title}) => ({key, title}))
        );
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
        const clientId = this.clientId;
        const libraryId = this.libraryId;
        storage.clear();
        if (clientId) {
            storage.setString('clientId', clientId);
        }
        if (libraryId) {
            storage.setString('libraryId', libraryId);
        }
    },
};
