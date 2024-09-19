import type {Observable} from 'rxjs';
import PersonalMediaLibrary from './PersonalMediaLibrary';

export default interface PersonalMediaServerSettings {
    readonly audioLibraries: readonly PersonalMediaLibrary[];
    readonly host: string;
    libraryId: string;
    libraries: readonly PersonalMediaLibrary[];
    readonly videoLibraryId?: string;
    observeLibraryId: () => Observable<string>;
}
