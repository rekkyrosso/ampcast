import BaseMediaService from './BaseMediaService';
import ServiceType from './ServiceType';

export default interface Scrobbler extends BaseMediaService {
    readonly serviceType: ServiceType.Scrobbler;
}
