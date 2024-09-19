import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged} from 'rxjs';
import MediaServiceId from 'types/MediaServiceId';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaServerSettings from 'types/PersonalMediaServerSettings';
import {LiteStorage} from 'utils';

export default class SubsonicSettings implements PersonalMediaServerSettings {
    private readonly storage: LiteStorage;
    private readonly libraryId$: BehaviorSubject<string>;

    constructor(serviceId: MediaServiceId) {
        this.storage = new LiteStorage(serviceId);
        this.libraryId$ = new BehaviorSubject(this.storage.getString('libraryId'));
    }

    get audioLibraries(): readonly PersonalMediaLibrary[] {
        return this.libraries;
    }

    get host(): string {
        return this.storage.getString('host');
    }

    set host(host: string) {
        this.storage.setString('host', host);
    }

    get credentials(): string {
        return this.storage.getString('credentials');
    }

    set credentials(credentials: string) {
        this.storage.setString('credentials', credentials);
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
        const libraries = this.storage.getJson<PersonalMediaLibrary[]>('libraries', []);
        if (libraries[0]?.id !== '') {
            libraries.splice(0, 0, {id: '', title: '(all)'});
        }
        return libraries;
    }

    set libraries(libraries: readonly PersonalMediaLibrary[]) {
        this.storage.setJson('libraries', libraries);
        const library = libraries.find((library) => library.id === this.libraryId);
        if (!library) {
            this.libraryId = '';
        }
    }

    get userName(): string {
        return this.storage.getString('userName');
    }

    set userName(userName: string) {
        this.storage.setString('userName', userName);
    }

    clear(): void {
        this.storage.removeItem('userName');
        this.storage.removeItem('credentials');
    }
}
