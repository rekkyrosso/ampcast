import {browser} from 'utils';
import ItemType from 'types/ItemType';
import MediaFilter from 'types/MediaFilter';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import ViewType from 'types/ViewType';
import {NoMusicLibrary} from 'services/errors';
import plexMediaType from './plexMediaType';
import plexSettings from './plexSettings';

interface PlexRequest {
    path: string;
    method?: 'GET' | 'PUT' | 'POST' | 'HEAD';
    headers?: Record<string, string>;
    params?: Record<string, any>;
    body?: any;
    host?: string;
    token?: string;
    keepalive?: boolean;
}

async function fetchJSON<T = any>({headers, body, ...rest}: PlexRequest): Promise<T> {
    headers = {...headers, Accept: 'application/json'};
    if (body) {
        headers = {...headers, 'Content-Type': 'application/json'};
        body = JSON.stringify(body);
    }
    const response = await plexFetch({
        headers,
        body,
        ...rest,
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
}: PlexRequest): Promise<Response> {
    if (!host) {
        throw Error(`No Plex connection.`);
    }

    path = params ? `${path}?${new URLSearchParams(params)}` : path;
    if (!path.startsWith('/')) {
        path = `/${path}`;
    }

    if (!token) {
        token = host === plexSettings.host ? plexSettings.serverToken : plexSettings.userToken;
    }

    const response = await fetch(`${host}${path}`, {
        method,
        headers: {
            ...headers,
            ...getHeaders(token),
        },
        body,
        keepalive,
    });

    if (!response.ok) {
        throw response;
    }

    return response;
}

async function getMusicLibraries(): Promise<readonly PersonalMediaLibrary[]> {
    const {
        MediaContainer: {Directory: sections},
    } = await fetchJSON<plex.DirectoryResponse>({
        path: '/library/sections',
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
    viewType: ViewType.ByDecade | ViewType.ByGenre,
    itemType: ItemType
): Promise<readonly MediaFilter[]> {
    if (viewType === ViewType.ByDecade) {
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

function getHeaders(token: string): Record<string, string> {
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
    return headers;
}

export function getMusicLibraryPath(path = 'all'): string {
    return `/library/sections/${getMusicLibraryId()}/${path}`;
}

export function getMusicLibraryId(): string {
    const libraryId = plexSettings.libraryId;
    if (!libraryId) {
        throw new NoMusicLibrary();
    }
    return libraryId;
}

function getPlexMediaType(itemType: ItemType): plexMediaType {
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

const plexApi = {
    fetch: plexFetch,
    fetchJSON,
    getFilters,
    getMusicLibraries,
};

export default plexApi;
