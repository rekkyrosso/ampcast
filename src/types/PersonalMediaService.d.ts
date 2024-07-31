import BaseMediaService from './BaseMediaService';
import PersonalMediaLibrary from './PersonalMediaLibrary';
import PersonalMediaLibrarySettings from './PersonalMediaLibrarySettings';
import ServiceType from './ServiceType';

export default interface PersonalMediaService
    extends BaseMediaService,
        Partial<PersonalMediaLibrarySettings> {
    readonly serviceType: ServiceType.PersonalMedia;
    // Everything below here should be optional.
    getLibraries?: () => Promise<readonly PersonalMediaLibrary[]>;
}
