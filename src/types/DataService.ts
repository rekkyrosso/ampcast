import BaseMediaService from './BaseMediaService';
import ServiceType from './ServiceType';

export default interface DataService extends BaseMediaService {
    readonly serviceType: ServiceType.DataService;
    // Everything below here should be optional.
    readonly Components?: BaseMediaService['Components'] & {
        ManagePlaylists?: React.FC<{service: DataService}>; // For Local DB
    };
    readonly canScrobble?: boolean;
}
