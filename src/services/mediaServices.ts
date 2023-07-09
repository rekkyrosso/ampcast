import {from, mergeMap, skipWhile, tap} from 'rxjs';
import MediaService from 'types/MediaService';
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
        plex,
        emby,
        jellyfin,
        navidrome,
        subsonic,
        lastfm,
        listenbrainz,
    ];
}

export function getLookupServices(): readonly MediaService[] {
    return getAllServices().filter((service) => !!service.lookup);
}

export function getService(serviceId: string): MediaService | undefined {
    return getAllServices().find((service) => service.id === serviceId);
}

export function isPlayableService(serviceId: string): boolean {
    const service = getService(serviceId);
    return service ? !service.isScrobbler : false;
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

export function hasPlayableSrc(item: {src: string}): boolean {
    return item ? isPlayableSrc(item.src) : false;
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
