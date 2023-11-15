import BaseMediaService from './BaseMediaService';
import MediaType from './MediaType';
import ServiceType from './ServiceType';

export default interface PublicMediaService extends BaseMediaService {
    readonly serviceType: ServiceType.PublicMedia;
    readonly primaryMediaType: MediaType;
    readonly restrictedAccess?: boolean; // Approved users only (testers)
}
