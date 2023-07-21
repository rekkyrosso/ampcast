import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged} from 'rxjs';
import {nanoid} from 'nanoid';
import MediaServiceId from 'types/MediaServiceId';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaLibrarySettings from 'types/PersonalMediaLibrarySettings';
import {LiteStorage, stringContainsMusic} from 'utils';

export class EmbySettings implements PersonalMediaLibrarySettings {
    private readonly storage: LiteStorage;
    private readonly libraryId$: BehaviorSubject<string>;

    constructor(id: MediaServiceId) {
        this.storage = new LiteStorage(id);
        this.libraryId$ = new BehaviorSubject(this.storage.getString('libraryId'));
    }

    get audioLibraries(): readonly PersonalMediaLibrary[] {
        return this.libraries.filter((library) => library.type !== 'musicvideos');
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

    get host(): string {
        return this.storage.getString('host');
    }

    set host(host: string) {
        this.storage.setString('host', host);
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

    get libraries(): PersonalMediaLibrary[] {
        return this.storage.getJson('libraries') || [];
    }

    set libraries(libraries: readonly PersonalMediaLibrary[]) {
        const library =
            libraries.find((library) => library.id === this.libraryId) ||
            libraries.find(
                (library) => library.type === 'music' && stringContainsMusic(library.title)
            ) ||
            libraries.find((library) => library.type === 'music') ||
            libraries.find((library) => library.type === 'audiobooks');
        this.storage.setJson('libraries', libraries);
        this.libraryId = library?.id || '';
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

    get videoLibraryId(): string | undefined {
        return this.libraries.find((library) => library.type === 'musicvideos')?.id;
    }

    clear(): void {
        this.storage.removeItem('serverId');
        this.storage.removeItem('userId');
        this.storage.removeItem('token');
    }
}

const embySettings = new EmbySettings('emby');

export default embySettings;
