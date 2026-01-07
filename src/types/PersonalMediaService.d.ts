import type React from 'react';
import type {Observable} from 'rxjs';
import BaseMediaService from './BaseMediaService';
import PersonalMediaLibrary from './PersonalMediaLibrary';
import PersonalMediaServerSettings from './PersonalMediaServerSettings';
import ServiceType from './ServiceType';

export default interface PersonalMediaService
    extends BaseMediaService,
        Partial<PersonalMediaServerSettings> {
    readonly host: string;
    readonly serviceType: ServiceType.PersonalMedia;
    // Everything below here should be optional.
    readonly Components?: BaseMediaService['Components'] & {
        ServerSettings?: React.FC<{service: PersonalMediaService}>;
    };
    readonly isLibraryLoading?: boolean;
    observeIsLibraryLoading?(this: unknown): Observable<boolean>;
    getLibraries?: () => Promise<readonly PersonalMediaLibrary[]>;
    getServerInfo?: () => Promise<Record<string, string>>;
    loadLibrary?: () => Promise<void>;
}
