import type {Observable} from 'rxjs';
import {from, map, merge, mergeMap, skipWhile, tap} from 'rxjs';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import PersonalMediaService from 'types/PersonalMediaService';
import PlaybackType from 'types/PlaybackType';
import PublicMediaService from 'types/PublicMediaService';
import DataService from 'types/DataService';
import ServiceType from 'types/ServiceType';
import actionsStore from 'services/actions/actionsStore';
import {dispatchMediaObjectChanges} from 'services/actions/mediaObjectChanges';
import apple from 'services/apple';
import emby from 'services/emby';
import jellyfin from 'services/jellyfin';
import lastfm from 'services/lastfm';
import listenbrainz from 'services/listenbrainz';
import navidrome from 'services/navidrome';
import plex from 'services/plex';
import plexSettings from 'services/plex/plexSettings';
import plexTidal from 'services/plex/tidal';
import spotify from 'services/spotify';
import subsonic from 'services/subsonic';
import youtube from 'services/youtube';
import {Logger, filterNotEmpty} from 'utils';
import {allowAllServices, isSourceVisible, setHiddenSources} from './servicesSettings';

const logger = new Logger('mediaServices');

actionsStore.registerServices(getEnabledServices());

function getAllServices(): readonly MediaService[] {
    return [
        apple,
        spotify,
        emby,
        jellyfin,
        navidrome,
        plex,
        plexTidal,
        subsonic,
        youtube,
        lastfm,
        listenbrainz,
    ];
}

// Available to most users but may be hidden by settings.
export function getEnabledServices(): readonly MediaService[] {
    return getAllServices().filter((service) => !service.disabled);
}

export function observePersonalMediaLibraryIdChanges(): Observable<void> {
    return merge(
        ...getPersonalMediaServices()
            .filter((service) => !!service.observeLibraryId)
            .map((service) => service.observeLibraryId!())
    ).pipe(map(() => undefined));
}

export function canPlayNow<T extends MediaItem>(item: T): boolean {
    if (isAlwaysPlayableSrc(item.src)) {
        return true;
    }
    const service = getServiceFromSrc(item);
    if (service?.isLoggedIn()) {
        return true;
    }
    return false;
}

export function getDataServices(): readonly DataService[] {
    return getEnabledServices().filter(isDataService);
}

export function getLookupServices(): readonly MediaService[] {
    return getEnabledServices().filter((service) => !!service.lookup);
}

export function getPersonalMediaServices(): readonly PersonalMediaService[] {
    return getEnabledServices().filter(isPersonalMediaService);
}

export function getPlayableServices(): readonly MediaService[] {
    return getAllServices().filter((service) => !isDataService(service));
}

export async function getPlaybackType(item: MediaItem): Promise<PlaybackType> {
    let playbackType = item.playbackType;
    if (playbackType === undefined) {
        const service = getServiceFromSrc(item);
        if (service?.getPlaybackType) {
            playbackType = await service.getPlaybackType(item);
        } else {
            playbackType = PlaybackType.Direct;
        }
        dispatchMediaObjectChanges({
            match: (object) => object.src === item.src,
            values: {playbackType},
        });
    }
    return playbackType;
}

export function getPublicMediaServices(): readonly PublicMediaService[] {
    return getEnabledServices().filter(isPublicMediaService);
}

export function getScrobblers(): readonly DataService[] {
    return getDataServices().filter((service) => service.canScrobble);
}

export function getService(serviceId: string): MediaService | undefined {
    return getAllServices().find((service) => service.id === serviceId);
}

export function getServiceFromSrc({src}: {src?: string} = {}): MediaService | undefined {
    const [serviceId] = String(src).split(':');
    return getService(serviceId);
}

export function hasPlayableSrc(item: {src: string}): boolean {
    return item ? isPlayableSrc(item.src) : false;
}

export function isAlwaysPlayableSrc(src: string): boolean {
    const [serviceId] = String(src).split(':');
    return /^(blob|file|https?|youtube)$/.test(serviceId);
}

export function isDataService(service: MediaService): service is DataService {
    return isMediaServiceType(service, ServiceType.DataService);
}

export function isPersonalMediaService(service: MediaService): service is PersonalMediaService {
    return isMediaServiceType(service, ServiceType.PersonalMedia);
}

export function isPlayableSrc(src: string): boolean {
    if (isAlwaysPlayableSrc(src)) {
        return true;
    }
    const [serviceId, type, id] = String(src).split(':');
    return !!id && !!type && isPlayableService(serviceId);
}

export function isPublicMediaService(service: MediaService): service is PublicMediaService {
    return isMediaServiceType(service, ServiceType.PublicMedia);
}

export function isScrobbler(service: MediaService): boolean {
    return isDataService(service) && !!service.canScrobble;
}

function isMediaService(service: any): service is MediaService {
    return service ? 'serviceType' in service : false;
}

function isMediaServiceType(service: MediaService, type: ServiceType): boolean {
    return isMediaService(service) && service.serviceType === type;
}

function isPlayableService(serviceId: string): boolean {
    const service = getService(serviceId);
    return service ? service.serviceType !== ServiceType.DataService : false;
}

// Ensure that only one public media service is visible
if (!allowAllServices || youtube.disabled) {
    let changed = false;
    const hidden: Record<string, boolean> = {};
    if (youtube.disabled && isSourceVisible(youtube)) {
        hidden[youtube.id] = true;
        changed = true;
    }
    if (!allowAllServices) {
        const visibleServices = getPublicMediaServices().filter(isSourceVisible);
        if (visibleServices.length > 1) {
            let services = visibleServices;
            if (!plexSettings.hasTidal) {
                services = filterNotEmpty(services, (service) => service !== plexTidal);
            }
            if (services.length > 1) {
                services = filterNotEmpty(services, (service) => service.isConnected());
                if (services.length > 1) {
                    const preferences = [apple, plexTidal, spotify, youtube];
                    while (services.length > 1 && preferences.length > 0) {
                        const leastPreferred = preferences.pop();
                        services = filterNotEmpty(
                            services,
                            (service) => service !== leastPreferred
                        );
                    }
                }
            }
            const [selectedService] = services;
            for (const service of visibleServices) {
                if (service !== selectedService) {
                    hidden[service.id] = true;
                    if (service.isConnected() && !service.authService) {
                        service.logout();
                    }
                }
            }
            changed = true;
        }
    }
    if (changed) {
        setHiddenSources(hidden);
    }
}

// Connectivity logging.

from(getEnabledServices())
    .pipe(
        mergeMap((service) =>
            service.observeIsLoggedIn().pipe(
                skipWhile((isLoggedIn) => !isLoggedIn),
                tap((isLoggedIn) => logger.log(`${service.id} ${isLoggedIn ? '' : 'dis'}connected`))
            )
        )
    )
    .subscribe(logger);
