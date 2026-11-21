import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import PlaybackData from 'types/PlaybackData';
import PlaybackType from 'types/PlaybackType';
import {getTextFromHtml, Logger, sleep, uniq} from 'utils';
import {dispatchMetadataChanges} from 'services/metadata';
import {refreshToken} from './soundcloudAuth';
import soundcloudSettings from './soundcloudSettings';

const logger = new Logger('soundcloudApi');

const soundcloudHost = 'https://soundcloud.com';
const apiHost = 'https://api.soundcloud.com';

async function disconnect(): Promise<void> {
    await post('/disconnect');
}

async function getMe(): Promise<SoundCloud.Me> {
    return get('/me');
}

async function follow(urn: string): Promise<void> {
    await post(`/me/followings/${urn}`);
}

async function unfollow(urn: string): Promise<void> {
    await del(`/me/followings/${urn}`);
}

async function like(urn: string): Promise<void> {
    const [, type] = urn.split(':');
    await post(`/likes/${type}/${urn}`);
}

async function unlike(urn: string): Promise<void> {
    const [, type] = urn.split(':');
    await del(`/likes/${type}/${urn}`);
}

// TODO: Prefer API.
async function getMediaItemFromUrl(url: string): Promise<MediaItem> {
    // Remove tracking/playlist/etc info from url.
    url = url.replace(/[?#].*$/, '');

    const response = await fetch(`${soundcloudHost}/oembed.json?url=${encodeURIComponent(url)}`);

    if (!response.ok) {
        switch (response.status) {
            case 401:
                throw Error('Embedding prevented by owner');

            case 403:
                throw Error('Private');

            case 404:
                throw Error('Track does not exist');

            default:
                throw Error(`${response.statusText} (${response.status})`);
        }
    }

    const track = await response.json();

    let trackId = '';
    try {
        const div = document.createElement('div');
        div.innerHTML = track.html;
        const iframe = div.firstElementChild as HTMLIFrameElement;
        const srcUrl = new URL(iframe.src);
        const params = new URLSearchParams(srcUrl.search);
        const paramsUrl = params.get('url');
        if (paramsUrl) {
            const trackUrl = new URL(paramsUrl);
            const [id, type] = trackUrl.pathname.split('/').reverse();
            if (type === 'tracks') {
                trackId = id;
            }
        }
    } catch (err) {
        console.warn(err);
    }

    const author = String(track.author_name || '');
    let title = String(track.title || '');
    let artist = author;
    if (title.endsWith(` by ${author}`)) {
        title = title.slice(0, -` by ${author}`.length);
    }
    if (title.startsWith(`${author} - `)) {
        title = title.slice(`${author} - `.length);
    } else {
        // Sometimes the title starts with a different artist.
        // Hopefully this is right.
        const [accreditedArtist, ...rest] = title.split(' - ');
        if (accreditedArtist && rest.length > 0) {
            artist = accreditedArtist;
            title = rest.join(' - ');
        }
    }

    return {
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        playbackType: PlaybackType.IFrame,
        src: trackId ? `soundcloud:tracks:${trackId}` : `soundcloud:url:${url}`,
        externalUrl: url,
        title: title,
        description: getTextFromHtml(track.description) || undefined,
        duration: 0,
        playedAt: 0,
        artists: artist ? [artist] : undefined,
        thumbnails: [
            {
                url: track.thumbnail_url,
                width: track.thumbnail_width || 500,
                height: track.thumbnail_height || 500,
            },
        ],
    };
}

async function getPlaybackData(item: MediaItem): Promise<PlaybackData> {
    try {
        const {token} = soundcloudSettings;
        if (!token) {
            throw Error('Not logged in');
        }
        const streams = await get<SoundCloud.Streams>(`/tracks/${item.src}/streams`);
        const src = streams.hls_aac_160_url || streams.hls_aac_96_url || streams.hls_mp3_128_url;
        if (src) {
            const response = await fetch(src, {
                method: 'GET',
                headers: {
                    Authorization: `OAuth ${token.access_token}`,
                },
            });
            const url = new URL(response.url);
            const expiresAt = (Number(url.searchParams.get('expires')) || 0) * 1000;
            return {
                playbackType: PlaybackType.HLS,
                playbackExpiresAt: Math.max(expiresAt - 60_000, 0),
                srcs: [url.href],
            };
        }
    } catch (err) {
        logger.error(err);
    }
    return {
        playbackType: PlaybackType.IFrame,
        playbackExpiresAt: undefined,
        srcs: undefined,
    };
}

async function updatePlaylistTracks(urn: string, trackUrns: readonly string[]): Promise<void> {
    const tracks = uniq(trackUrns).map((urn) => ({urn}));
    await put(`/playlists/${urn}`, {tracks});
    dispatchMetadataChanges({
        match: (item) => item.src === urn,
        values: {
            trackCount: tracks.length,
        },
    });
}

async function get<T>(path: string, params?: Record<string, any>): Promise<T> {
    return soundcloudApiCall(path, params, {method: 'GET'});
}

async function del(path: string, params?: Record<string, any>): Promise<void> {
    return soundcloudApiCall(path, params, {method: 'DELETE'});
}

async function post<T>(path: string, params?: Record<string, any>): Promise<T> {
    return soundcloudApiCall(path, undefined, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(params),
    });
}

async function put<T>(path: string, params?: Record<string, any>): Promise<T> {
    return soundcloudApiCall(path, undefined, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(params),
    });
}

async function soundcloudApiCall<T>(
    path: string,
    params: Record<string, any> | undefined,
    init: RequestInit
): Promise<T> {
    return soundcloudApiCallWithRetry(async () => {
        const {token} = soundcloudSettings;
        if (!token) {
            throw Error('No access token');
        }
        path = params
            ? `${path}${path.includes('?') ? '&' : '?'}${new URLSearchParams(params as any)}`
            : path;
        if (path.startsWith('/')) {
            path = path.slice(1);
        }
        if (!path.startsWith('https:')) {
            path = `${apiHost}/${path}`;
        }
        init.headers = {
            ...init.headers,
            Accept: 'application/json; charset=utf-8',
            Authorization: `OAuth ${token.access_token}`,
        };
        const response = await fetch(path, init);
        if (!response.ok) {
            let err: any = response;
            try {
                err = await response.json();
            } catch {
                // ignore
            }
            throw err;
        }
        if (response.headers.get('content-type')?.includes('application/json')) {
            return response.json();
        }
    });
}

async function soundcloudApiCallWithRetry<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
        const result = await apiCall();
        return result;
    } catch (err: any) {
        switch (err.status) {
            case 401:
                await refreshToken();
                return apiCall();

            case 429: {
                const retryAfter = Number(err.headers?.get('Retry-After'));
                if (retryAfter && retryAfter <= 5) {
                    await sleep(retryAfter * 1000);
                    return apiCall();
                } else {
                    throw err;
                }
            }

            default:
                throw err;
        }
    }
}

const soundcloudApi = {
    disconnect,
    follow,
    unfollow,
    get,
    getMe,
    getMediaItemFromUrl,
    getPlaybackData,
    like,
    post,
    put,
    unlike,
    updatePlaylistTracks,
};

export default soundcloudApi;
