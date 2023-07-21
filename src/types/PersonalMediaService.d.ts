import BaseMediaService from './BaseMediaService';
import PersonalMediaLibrary from './PersonalMediaLibrary';
import PersonalMediaLibrarySettings from './PersonalMediaLibrarySettings';
import ServiceType from './ServiceType';

export default interface PersonalMediaService
    extends BaseMediaService,
        Partial<PersonalMediaLibrarySettings> {
    readonly serviceType: ServiceType.PersonalMedia;
    getLibraries?: () => Promise<readonly PersonalMediaLibrary[]>;
}
