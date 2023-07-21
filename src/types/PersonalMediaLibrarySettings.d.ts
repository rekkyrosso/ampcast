import type {Observable} from 'rxjs';
import PersonalMediaLibrary from './PersonalMediaLibrary';

export default interface PersonalMediaLibrarySettings {
    readonly audioLibraries: readonly PersonalMediaLibrary[];
    libraryId: string;
    libraries: readonly PersonalMediaLibrary[];
    readonly videoLibraryId?: string;
    observeLibraryId: () => Observable<string>;
}
