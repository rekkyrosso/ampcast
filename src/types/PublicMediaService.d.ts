import BaseMediaService from './BaseMediaService';
import MediaType from './MediaType';
import ServiceType from './ServiceType';

export default interface PublicMediaService extends BaseMediaService {
    readonly serviceType: ServiceType.PublicMedia;
    readonly components?: BaseMediaService['components'] & {
        StreamingSettings?: React.FC<{service: PublicMediaService}>;
    };
    // Everything below here should be optional.
    readonly primaryMediaType?: MediaType;
}
