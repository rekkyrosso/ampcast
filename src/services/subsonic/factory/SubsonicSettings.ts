import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged} from 'rxjs';
import {PersonalMediaServiceId} from 'types/MediaServiceId';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaServerSettings from 'types/PersonalMediaServerSettings';
import {LiteStorage} from 'utils';
import {getServerHost, isStartupService} from 'services/buildConfig';

export default class SubsonicSettings implements PersonalMediaServerSettings {
    private readonly storage = new LiteStorage(this.serviceId);
    private readonly libraryId$ = new BehaviorSubject(this.storage.getString('libraryId'));

    constructor(private readonly serviceId: PersonalMediaServiceId) {}

    get audioLibraries(): readonly PersonalMediaLibrary[] {
        return this.libraries;
    }

    get connectedAt(): number {
        return this.storage.getNumber(
            'connectedAt',
            this.credentials || isStartupService(this.serviceId) ? 1 : 0
        );
    }

    set connectedAt(connectedAt: number) {
        this.storage.setNumber('connectedAt', connectedAt);
    }

    get credentials(): string {
        return this.storage.getString('credentials');
    }

    set credentials(credentials: string) {
        this.storage.setString('credentials', credentials);
    }

    get host(): string {
        return this.storage.getString('host', getServerHost(this.serviceId));
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

    get useManualLogin(): boolean {
        return this.storage.getBoolean('useManualLogin');
    }

    set useManualLogin(useManualLogin: boolean) {
        this.storage.setBoolean('useManualLogin', useManualLogin);
    }

    clear(): void {
        this.storage.removeItem('userName');
        this.storage.removeItem('credentials');
    }
}
