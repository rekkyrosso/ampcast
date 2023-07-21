import type {Observable} from 'rxjs';
import {from, map, merge, mergeMap, skipWhile, tap} from 'rxjs';
import MediaService from 'types/MediaService';
import PersonalMediaService from 'types/PersonalMediaService';
import PublicMediaService from 'types/PublicMediaService';
import Scrobbler from 'types/Scrobbler';
import ServiceType from 'types/ServiceType';
import apple from 'services/apple';
import emby from 'services/emby';
import jellyfin from 'services/jellyfin';
import lastfm from 'services/lastfm';
import listenbrainz from 'services/listenbrainz';
import navidrome from 'services/navidrome';
import plex from 'services/plex';
import spotify from 'services/spotify';
import subsonic from 'services/subsonic';
import youtube from 'services/youtube';
import {Logger} from 'utils';

const logger = new Logger('mediaServices');

export function getAllServices(): readonly MediaService[] {
    return [
        apple,
        spotify,
        youtube,
        emby,
        jellyfin,
        navidrome,
        plex,
        subsonic,
        lastfm,
        listenbrainz,
    ];
}

export function observePersonalMediaLibraryIdChanges(): Observable<void> {
    return merge(
        ...getPersonalMediaServices()
            .filter((service) => !!service.observeLibraryId)
            .map((service) => service.observeLibraryId!())
    ).pipe(map(() => undefined));
}

export function getLookupServices(): readonly MediaService[] {
    return getAllServices().filter((service) => !!service.lookup);
}

export function getMediaServices(): readonly MediaService[] {
    return getAllServices().filter((service) => !isScrobbler(service));
}

export function getPersonalMediaServices(): readonly PersonalMediaService[] {
    return getAllServices().filter(isPersonalMediaService);
}

export function getPublicMediaServices(): readonly PublicMediaService[] {
    return getAllServices().filter(isPublicMediaService);
}

export function getScrobblers(): readonly Scrobbler[] {
    return getAllServices().filter(isScrobbler);
}

export function getService(serviceId: string): MediaService | undefined {
    return getAllServices().find((service) => service.id === serviceId);
}

export function getServiceFromSrc({src = ''}: {src?: string} = {}): MediaService | undefined {
    const [serviceId] = src?.split(':') || [''];
    return getService(serviceId);
}

export function hasPlayableSrc(item: {src: string}): boolean {
    return item ? isPlayableSrc(item.src) : false;
}

export function isPlayableService(serviceId: string): boolean {
    const service = getService(serviceId);
    return service ? service.serviceType !== ServiceType.Scrobbler : false;
}

export function isPlayableSrc(src: string): boolean {
    if (src) {
        const [serviceId, type, id] = src.split(':');
        if (serviceId === 'blob' || serviceId === 'file') {
            return true;
        }
        return !!id && !!type && isPlayableService(serviceId);
    }
    return false;
}

export function isPersonalMediaService(service: MediaService): service is PersonalMediaService {
    return isMediaServiceType(service, ServiceType.PersonalMedia);
}

export function isPublicMediaService(service: MediaService): service is PublicMediaService {
    return isMediaServiceType(service, ServiceType.PublicMedia);
}

export function isScrobbler(service: MediaService): service is Scrobbler {
    return isMediaServiceType(service, ServiceType.Scrobbler);
}

function isMediaService(service: any): service is MediaService {
    return service ? 'serviceType' in service : false;
}

function isMediaServiceType(service: any, type: ServiceType): boolean {
    return isMediaService(service) && service.serviceType === type;
}

// Connectivity logging.

from(getAllServices())
    .pipe(
        mergeMap((service) =>
            service.observeIsLoggedIn().pipe(
                skipWhile((isLoggedIn) => !isLoggedIn),
                tap((isLoggedIn) =>
                    logger.log(`${service.name} ${isLoggedIn ? '' : 'dis'}connected`)
                )
            )
        )
    )
    .subscribe(logger);
