import BaseMediaService from './BaseMediaService';
import MediaType from './MediaType';
import ServiceType from './ServiceType';

export default interface PublicMediaService extends BaseMediaService {
    readonly serviceType: ServiceType.PublicMedia;
    // Everything below here should be optional.
    readonly Components?: BaseMediaService['Components'] & {
        StreamingSettings?: React.FC<{service: PublicMediaService}>;
    };
    readonly primaryMediaType?: MediaType;
}
