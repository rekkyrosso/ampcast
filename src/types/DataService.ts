import BaseMediaService from './BaseMediaService';
import ServiceType from './ServiceType';

export default interface DataService extends BaseMediaService {
    readonly serviceType: ServiceType.DataService;
    readonly canScrobble?: boolean;
}
