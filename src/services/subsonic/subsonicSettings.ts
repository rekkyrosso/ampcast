import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged} from 'rxjs';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaLibrarySettings from 'types/PersonalMediaLibrarySettings';
import {LiteStorage} from 'utils';

const storage = new LiteStorage('subsonic');
const libraryId$ = new BehaviorSubject(storage.getString('libraryId'));

const subsonicSettings = {
    get audioLibraries(): readonly PersonalMediaLibrary[] {
        return this.libraries;
    },

    get host(): string {
        return storage.getString('host');
    },

    set host(host: string) {
        storage.setString('host', host);
    },

    get credentials(): string {
        return storage.getString('credentials');
    },

    set credentials(credentials: string) {
        storage.setString('credentials', credentials);
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
        storage.setJson('libraries', libraries);
        const library = libraries.find((library) => library.id === this.libraryId);
        if (!library) {
            this.libraryId = '';
        }
    },

    get userName(): string {
        return storage.getString('userName');
    },

    set userName(userName: string) {
        storage.setString('userName', userName);
    },

    clear(): void {
        storage.removeItem('userName');
        storage.removeItem('credentials');
    },
};

export default subsonicSettings satisfies PersonalMediaLibrarySettings;
