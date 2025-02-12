import MediaService from './MediaService';
import MediaServiceId, {PersonalMediaServiceId} from './MediaServiceId';
import PersonalMediaService from './PersonalMediaService';

export default interface BuildConfig {
    readonly enabledServices: readonly string[];
    getServerHost(service: PersonalMediaService): string;
    getServerHost(serviceId: PersonalMediaServiceId): string;
    hasProxyLogin(service: PersonalMediaService): boolean;
    hasProxyLogin(serviceId: PersonalMediaServiceId): boolean;
    isStartupService(service: MediaService): boolean;
    isStartupService(serviceId: MediaServiceId): boolean;
    isServiceDisabled(service: MediaService): boolean;
    isServiceDisabled(serviceId: MediaServiceId): boolean;
}
