import BuildConfig from 'types/BuildConfig';
import MediaService from 'types/MediaService';
import MediaServiceId, {PersonalMediaServiceId} from 'types/MediaServiceId';
import PersonalMediaService from 'types/PersonalMediaService';
import {decode, Logger} from 'utils';

const logger = new Logger('buildConfig');

let enabledServices: string[] = [];
let startupServices: string[] = [];
let personalMediaServers: Partial<
    Record<
        PersonalMediaServiceId,
        {
            readonly host: string;
            readonly hasProxyLogin: boolean;
            readonly locked: boolean;
        }
    >
> = {};

try {
    enabledServices = decode(__enabled_services__).match(/[^\s,]+/g) || [];
    startupServices = decode(__startup_services__).match(/[^\s,]+/g) || [];
    personalMediaServers = JSON.parse(decode(__personal_media_servers__));
} catch (err) {
    logger.error(err);
}

const buildConfig: BuildConfig = {
    enabledServices,
    getServerHost,
    hasProxyLogin,
    isStartupService,
    isServiceDisabled,
};

export default buildConfig;

export const am_dev_token = decode(__am_dev_token__);
export const lf_api_key = decode(__lf_api_key__);
export const lf_api_secret = decode(__lf_api_secret__);
export const sp_client_id = decode(__sp_client_id__);
export const td_client_id = decode(__td_client_id__);
export const yt_client_id = decode(__yt_client_id__);

export function getServerHost(service: PersonalMediaService | PersonalMediaServiceId): string {
    const serviceId: PersonalMediaServiceId = typeof service === 'string' ? service : service.id;
    return personalMediaServers[serviceId]?.host || '';
}

export function hasProxyLogin(service: PersonalMediaService | PersonalMediaServiceId): boolean {
    const serviceId: PersonalMediaServiceId = typeof service === 'string' ? service : service.id;
    return personalMediaServers[serviceId]?.hasProxyLogin || false;
}

export function isServerLocked(service: PersonalMediaService | PersonalMediaServiceId): boolean {
    const serviceId: PersonalMediaServiceId = typeof service === 'string' ? service : service.id;
    return personalMediaServers[serviceId]?.locked || false;
}

export function isStartupService(service: MediaService | MediaServiceId): boolean {
    const serviceId: MediaServiceId = typeof service === 'string' ? service : service.id;
    return !isServiceDisabled(serviceId) && startupServices.includes(serviceId);
}

export function isServiceDisabled(service: MediaService | MediaServiceId): boolean {
    const serviceId: MediaServiceId = typeof service === 'string' ? service : service.id;
    return (
        serviceId !== 'localdb' &&
        enabledServices.length !== 0 &&
        !enabledServices.includes(serviceId) &&
        localStorage.getItem(`ampcast/${serviceId}/enabled`) !== 'true'
    );
}
