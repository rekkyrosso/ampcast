import ItemType from 'types/ItemType';
import PlaybackType from 'types/PlaybackType';
import browser from './browser';
import {getContentType, getHeaders} from './fetch';

const audio = document.createElement('audio');
const video = document.createElement('video');

export const mediaTypes: Record<string, ReadonlyArray<string>> = {
    hls: ['application/x-mpegurl', 'application/vnd.apple.mpegurl'],
    m3u: ['audio/x-scpls', 'audio/x-mpegurl'], // Or `pls`.
    ogg: ['audio/ogg', 'application/ogg'],
};

export function canPlayNativeHls(): boolean {
    // TODO: Chrome browsers now support native HLS playback.
    // However CORS restrictions mean that playback from personal media servers is unreliable.
    // return mediaTypes.hls.some((type) => canPlayType('audio', type));
    return browser.name === 'safari';
}

export function canPlayType(type: 'audio' | 'video', contentType: string): boolean {
    const element = type === 'video' ? video : audio;
    return !!element.canPlayType(contentType).replace('no', '');
}

export function canPlayAudio(src: string): Promise<boolean> {
    return canPlayMedia('audio', src);
}

export function canPlayVideo(src: string): Promise<boolean> {
    return canPlayMedia('video', src);
}

export function canPlayMedia(type: 'audio' | 'video', src: string): Promise<boolean> {
    return new Promise((resolve) => {
        const media = document.createElement(type);
        const resolveAs = (result: boolean) => () => {
            media.removeAttribute('src');
            clearTimeout(timerId);
            resolve(result);
        };
        const resolveFalse = resolveAs(false);
        const resolveTrue = resolveAs(true);
        const timerId = setTimeout(resolveTrue, 1000);
        try {
            media.muted = true;
            media.crossOrigin = 'anonymous';
            media.onerror = resolveFalse;
            media.oncanplay = resolveTrue;
            media.onplaying = resolveTrue;
            media.ontimeupdate = resolveTrue;
            media.setAttribute('src', src);
            media.play().then(undefined, resolveFalse);
        } catch {
            resolveFalse();
        }
    });
}

export function getMediaLabel(itemType: ItemType, serviceId?: string): string {
    switch (itemType) {
        case ItemType.Playlist:
            return 'Playlists';

        case ItemType.Album:
            return 'Albums';

        case ItemType.Artist:
            return 'Artists';

        case ItemType.Folder:
            return 'Folders';

        default: {
            switch (serviceId) {
                case 'ibroadcast':
                case 'lastfm':
                case 'listenbrainz':
                case 'plex':
                    return 'Tracks';

                case 'youtube':
                    return 'Videos';

                default:
                    return 'Songs';
            }
        }
    }
}

export async function getPlaybackTypeFromUrl(url: string): Promise<PlaybackType> {
    const headers = await getHeaders(url);
    const contentType = headers.get('content-type')?.toLowerCase() || '';
    if (mediaTypes.hls.includes(contentType)) {
        return PlaybackType.HLS;
    } else if (mediaTypes.m3u.includes(contentType)) {
        // All the other options will fail anyway (for now).
        return PlaybackType.IcecastM3u;
    } else {
        return PlaybackType.Direct;
    }
}

export async function isHlsMedia(url: string): Promise<boolean> {
    const contentType = await getContentType(url);
    return mediaTypes.hls.includes(contentType);
}
