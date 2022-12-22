import MediaService from 'types/MediaService';
import apple from 'services/apple';
import jellyfin from 'services/jellyfin';
import lastfm from 'services/lastfm';
import listenbrainz from 'services/listenbrainz';
import plex from 'services/plex';
import spotify from 'services/spotify';
import youtube from 'services/youtube';

export function getAllServices(): readonly MediaService[] {
    return [apple, spotify, youtube, plex, jellyfin, lastfm, listenbrainz];
}

export function getLookupServices(): readonly MediaService[] {
    return getAllServices().filter((service) => !!service.lookup);
}

export function getService(serviceId: string): MediaService | undefined {
    return getAllServices().find((service) => service.id === serviceId);
}

export function isPlayableService(serviceId: string): boolean {
    const service = getService(serviceId);
    return service ? !service.scrobbler : false;
}

export function hasPlayableSrc(item: {src: string}): boolean {
    if (item) {
        const [serviceId, type, id] = item.src.split(':');
        if (serviceId === 'blob' || serviceId === 'file') {
            return true;
        }
        return !!id && !!type && isPlayableService(serviceId);
    }
    return false;
}
