import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged} from 'rxjs';
import {nanoid} from 'nanoid';
import MediaServiceId from 'types/MediaServiceId';
import {LiteStorage} from 'utils';

export interface EmbyLibrary {
    readonly id: string;
    readonly title: string;
    readonly type: string;
}

export class EmbySettings {
    private readonly storage: LiteStorage;
    private readonly libraryId$: BehaviorSubject<string>;

    constructor(id: MediaServiceId) {
        this.storage = new LiteStorage(id);
        this.libraryId$ = new BehaviorSubject(this.storage.getString('libraryId'));
    }

    get host(): string {
        return this.storage.getString('host');
    }

    set host(host: string) {
        this.storage.setString('host', host);
    }

    get device(): string {
        return 'PC';
    }

    get deviceId(): string {
        let deviceId = this.storage.getString('deviceId');
        if (!deviceId) {
            deviceId = nanoid();
            this.storage.setString('deviceId', deviceId);
        }
        return deviceId;
    }

    get libraryId(): string {
        return this.storage.getString('libraryId');
    }

    set libraryId(libraryId: string) {
        this.storage.setString('libraryId', libraryId);
        this.libraryId$.next(libraryId);
    }

    observeLibraryId(): Observable<string> {
        return this.libraryId$.pipe(distinctUntilChanged());
    }

    get libraries(): EmbyLibrary[] {
        return this.storage.getJson('libraries') || [];
    }

    set libraries(libraries: readonly EmbyLibrary[]) {
        this.storage.setJson('libraries', libraries);
    }

    get serverId(): string {
        return this.storage.getString('serverId');
    }

    set serverId(serverId: string) {
        this.storage.setString('serverId', serverId);
    }

    get token(): string {
        return this.storage.getString('token');
    }

    set token(token: string) {
        this.storage.setString('token', token);
    }

    get userId(): string {
        return this.storage.getString('userId');
    }

    set userId(userId: string) {
        this.storage.setString('userId', userId);
    }

    clear(): void {
        this.storage.removeItem('serverId');
        this.storage.removeItem('userId');
        this.storage.removeItem('token');
    }
}

const embySettings = new EmbySettings('emby');

export default embySettings;
