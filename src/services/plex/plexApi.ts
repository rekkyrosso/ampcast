import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaFilter from 'types/MediaFilter';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import {NoMusicLibraryError} from 'services/errors';
import {browser, canPlayMedia, partition} from 'utils';
import plexItemType from './plexItemType';
import plexMediaType from './plexMediaType';
import plexSettings from './plexSettings';

export interface PlexRequest {
    path: string;
    method?: 'HEAD' | 'GET' | 'PUT' | 'DELETE' | 'POST';
    headers?: Record<string, string>;
    params?: Record<string, any>;
    body?: any;
    host?: string;
    token?: string;
    keepalive?: boolean;
    timeout?: number; // MS
}

export const apiHost = `https://plex.tv/api/v2`;

async function fetchJSON<T = any>({headers, body, ...request}: PlexRequest): Promise<T> {
    headers = {...headers, Accept: 'application/json'};
    if (body) {
        headers = {...headers, 'Content-Type': 'application/json'};
        body = JSON.stringify(body);
    }
    const response = await plexFetch({
        headers,
        body,
        ...request,
    });
    return response.json();
}

async function plexFetch({
    host = plexSettings.host,
    path,
    method = 'GET',
    params,
    headers,
    body,
    token,
    keepalive,
    timeout,
}: PlexRequest): Promise<Response> {
    if (!host) {
        throw Error(`No Plex connection.`);
    }

    path = params ? `${path}?${new URLSearchParams(params)}` : path;
    if (path.startsWith('/')) {
        path = path.slice(1);
    }

    if (!token) {
        token = host === plexSettings.host ? plexSettings.serverToken : plexSettings.userToken;
    }

    const drm = host === plexSettings.host ? undefined : plexSettings.drm;

    const init: RequestInit = {
        method,
        headers: {
            ...headers,
            ...getHeaders(token, drm),
        },
        body,
        keepalive,
    };

    if (timeout) {
        init.signal = AbortSignal.timeout(timeout);
    }

    const response = await fetch(`${host}/${path}`, init);

    if (!response.ok) {
        throw response;
    }

    return response;
}

async function addToPlaylist(
    playlist: MediaPlaylist,
    items: readonly MediaItem[],
    host = plexSettings.host
): Promise<void> {
    const ratingKey = getRatingKeyFromSrc(playlist);
    const method = 'PUT';
    const path = `/playlists/${ratingKey}/items`;
    if (items.length > 0) {
        const uri = toPlexUri(items);
        await fetchJSON<plex.Playlist>({host, method, path, params: {uri}});
    }
}

async function createPlaylist(
    title: string,
    summary: string,
    items: readonly MediaItem[],
    host = plexSettings.host
): Promise<plex.Playlist> {
    const type = 'audio';
    const uri = toPlexUri(items);
    const {
        MediaContainer: {Metadata: [playlist] = []},
    } = await fetchJSON<plex.MetadataResponse>({
        host,
        method: 'POST',
        path: '/playlists',
        params: {type, title, uri, smart: 0},
    });
    // Need to do these sequentially.
    if (summary) {
        await plexFetch({
            host,
            method: 'PUT',
            path: `/playlists/${playlist.ratingKey}`,
            params: {summary},
        });
    }
    return playlist as plex.Playlist;
}

function toPlexUri(items: readonly MediaItem[]): string {
    const ids = items.map(getRatingKeyFromSrc).join(',');
    return `server://${plexSettings.serverId}/com.plexapp.plugins.library/library/metadata/${ids}`;
}

async function getAccount(token: string): Promise<plex.Account> {
    const {MyPlex: account} = await fetchJSON<plex.AccountResponse>({
        path: 'myplex/account',
        token,
    });
    return account;
}

async function getServers(token = plexSettings.serverToken): Promise<readonly plex.Device[]> {
    const devices = await fetchJSON<plex.Device[]>({
        host: apiHost,
        path: '/resources',
        params: {includeHttps: '1'},
        token,
    });
    // Sort "owned" servers to the top.
    return partition(
        devices.filter((device) => device.provides === 'server'),
        (device) => device.owned
    ).flat();
}

async function getMusicLibraries(
    host = plexSettings.host,
    token = plexSettings.serverToken
): Promise<readonly PersonalMediaLibrary[]> {
    const {
        MediaContainer: {Directory: sections},
    } = await fetchJSON<plex.DirectoryResponse>({
        host,
        path: '/library/sections',
        token,
    });
    return sections
        .filter((section) => section.type === 'artist')
        .map(({key: id, title}) => ({id, title}));
}

async function getDecades(): Promise<readonly MediaFilter[]> {
    const {
        MediaContainer: {Directory: decades},
    } = await fetchJSON<plex.DirectoryResponse>({
        path: getMusicLibraryPath('decade'),
        params: {type: plexMediaType.Album},
    });
    const thisDecade = Math.floor(new Date().getFullYear() / 10) * 10;
    return decades
        .filter(({key: decade}) => Number(decade) > 500 && Number(decade) <= thisDecade)
        .map(({key: id, title}) => ({id, title}));
}

async function getFilters(
    filterType: FilterType,
    itemType: ItemType
): Promise<readonly MediaFilter[]> {
    if (filterType === FilterType.ByDecade) {
        return getDecades();
    } else {
        return getGenres(itemType);
    }
}

async function getGenres(itemType: ItemType): Promise<readonly MediaFilter[]> {
    const type = getPlexMediaType(itemType);
    const {
        MediaContainer: {Directory: genres},
    } = await fetchJSON<plex.DirectoryResponse>({
        path: getMusicLibraryPath('genre'),
        params: {type},
    });
    return genres.map(({key: id, title}) => ({id, title}));
}

export function getMusicLibraryPath(path = 'all'): string {
    return `/library/sections/${getMusicLibraryId()}/${path}`;
}

export function getMusicLibraryId(): string {
    const libraryId = plexSettings.libraryId;
    if (!libraryId) {
        throw new NoMusicLibraryError();
    }
    return libraryId;
}

async function search<T extends plex.MediaObject>({
    params: {type, ...params} = {},
    ...request
}: PlexRequest): Promise<readonly T[]> {
    const {
        MediaContainer: {SearchResult = []},
    } = await fetchJSON<plex.SearchResultResponse>({...request, params});
    const items = SearchResult.map((result) => result.Metadata).filter((item) => item.type === type);
    return getMetadata(
        items.map((item) => item.ratingKey),
    );
}

async function getMetadata<T extends plex.MediaObject>(
    ratingKeys: readonly string[],
    host = plexSettings.host
): Promise<readonly T[]> {
    if (ratingKeys.length === 0) {
        return [];
    }
    const {
        MediaContainer: {Metadata = []},
    } = await fetchJSON<plex.MetadataResponse<T>>({
        host,
        path: `/library/metadata/${ratingKeys.join(',')}`,
        headers: {
            'X-Plex-Container-Start': '0',
            'X-Plex-Container-Size': String(ratingKeys.length),
        },
    });
    return Metadata;
}

function getPlayableUrl(item: PlayableItem): string {
    const {host, serverToken} = plexSettings;
    if (host && serverToken) {
        if (item.playbackType === PlaybackType.Direct) {
            const [src] = item.srcs || [];
            if (!src) {
                throw Error('No playable source');
            }
            return `${host}${src}?X-Plex-Token=${serverToken}`;
        } else {
            const [, type, ratingKey] = item.src.split(':');
            const mediaType = type === 'video' ? 'video' : 'music';
            const params = new URLSearchParams({
                path: `/library/metadata/${ratingKey}`,
                hasMDE: '1',
                mediaIndex: '0',
                partIndex: '0',
                musicBitrate: '320',
                directStreamAudio: '1',
                mediaBufferSize: '12288',
                protocol: item.playbackType === PlaybackType.HLS ? 'hls' : 'dash',
                directPlay: '0',
                ...getHeaders(serverToken),
                'X-Plex-Client-Profile-Extra':
                    'add-transcode-target(type=musicProfile&context=streaming&protocol=dash&container=mp4&audioCodec=aac)+add-transcode-target(type=musicProfile&context=streaming&protocol=hls&container=mpegts&audioCodec=aac,mp3)',
            });
            return `${host}/${mediaType}/:/transcode/universal/start.mpd?${params}`;
        }
    } else {
        throw Error('Not logged in');
    }
}

async function getPlaybackType(item: MediaItem): Promise<PlaybackType> {
    try {
        const {host, serverToken} = plexSettings;
        const [src] = item.srcs || [];
        const url = `${host}${src}?X-Plex-Token=${serverToken}`;
        const directPlay = await canPlayMedia(
            item.mediaType === MediaType.Video ? 'video' : 'audio',
            url
        );
        return directPlay ? PlaybackType.Direct : PlaybackType.HLS;
    } catch {
        return PlaybackType.Direct;
    }
}

function getHeaders(token: string, drm?: string): Record<string, string> {
    const headers: Record<string, string> = {
        // This app
        'X-Plex-Product': __app_name__,
        'X-Plex-Version': __app_version__,
        // This browser
        'X-Plex-Platform': browser.displayName,
        'X-Plex-Platform-Version': browser.version,
        'X-Plex-Device': browser.os,
        'X-Plex-Device-Name': browser.displayName,
        // This particular browser
        'X-Plex-Client-Identifier': plexSettings.clientId,
        // Other
        'X-Plex-Model': 'hosted',
        'Accept-Encoding': 'gzip, deflate, br',
    };
    if (token) {
        headers['X-Plex-Token'] = token;
    }
    if (drm) {
        headers['X-Plex-Drm'] = drm;
    }
    return headers;
}

export function getPlexMediaType(itemType: ItemType): plexMediaType {
    switch (itemType) {
        case ItemType.Album:
            return plexMediaType.Album;

        case ItemType.Artist:
            return plexMediaType.Artist;

        case ItemType.Playlist:
            return plexMediaType.Playlist;

        default:
            return plexMediaType.Track;
    }
}

export function getPlexItemType(itemType: ItemType, mediaType?: MediaType): plexItemType {
    switch (itemType) {
        case ItemType.Album:
            return plexItemType.Album;

        case ItemType.Artist:
            return plexItemType.Artist;

        case ItemType.Playlist:
            return plexItemType.Playlist;

        default:
            return mediaType === MediaType.Video ? plexItemType.Clip : plexItemType.Track;
    }
}

function getRatingKeyFromSrc({src}: {src: string}): string {
    const [, , ratingKey] = src.split(':');
    return ratingKey;
}

const plexApi = {
    addToPlaylist,
    createPlaylist,
    fetch: plexFetch,
    fetchJSON,
    getAccount,
    getFilters,
    getHeaders,
    getMetadata,
    getMusicLibraries,
    getPlayableUrl,
    getPlaybackType,
    getServers,
    search,
};

export default plexApi;
