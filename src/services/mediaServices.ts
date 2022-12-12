import MediaService from 'types/MediaService';
import apple from 'services/apple';
import jellyfin from 'services/jellyfin';
import lastfm from 'services/lastfm';
import listenbrainz from 'services/listenbrainz';
import plex from 'services/plex';
import spotify from 'services/spotify';
import youtube from 'services/youtube';

const mediaServicesMap = new Map<string, MediaService>(
    [apple, spotify, youtube, plex, jellyfin, lastfm, listenbrainz].map((service) => [
        service.id,
        service,
    ])
);

const mediaServicesArray: readonly MediaService[] = [...mediaServicesMap.values()];

export function getAllServices(): readonly MediaService[] {
    return mediaServicesArray;
}

export function getService(id: string): MediaService | undefined {
    return mediaServicesMap.get(id);
}

export function isPlayableService(id: string): boolean {
    const service = getService(id);
    return service ? !service.scrobbler : false;
}

export function hasPlayableSrc(item: {src: string}): boolean {
    if (item) {
        const [serviceId, type, id] = item.src.split(':');
        return !!id && !!type && isPlayableService(serviceId);
    }
    return false;
}
