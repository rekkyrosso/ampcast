import {browser} from 'utils';
import ItemType from 'types/ItemType';
import MediaFilter from 'types/MediaFilter';
import MediaType from 'types/MediaType';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import ViewType from 'types/ViewType';
import {NoMusicLibrary} from 'services/errors';
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
}

export const musicPlayHost = 'https://play.provider.plex.tv';
export const musicProviderHost = 'https://music.provider.plex.tv';
export const musicSearchHost = 'https://discover.provider.plex.tv';

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

    const response = await fetch(`${host}/${path}`, {
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

async function getAccount(token: string): Promise<plex.Account> {
    const {MyPlex: account} = await fetchJSON<plex.AccountResponse>({
        path: 'myplex/account',
        token,
    });
    return account;
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

async function search<T extends plex.MediaObject>({
    params: {type, ...params} = {},
    ...request
}: PlexRequest): Promise<readonly T[]> {
    let items: readonly T[] = [];
    let results: readonly plex.SearchResult[] = [];
    if (request.host === musicSearchHost) {
        const {
            MediaContainer: {
                SearchResults: [{SearchResult = []}],
            },
        } = await fetchJSON<plex.SearchResultsResponse>({...request, params});
        results = SearchResult;
    } else {
        const {
            MediaContainer: {SearchResult = []},
        } = await fetchJSON<plex.SearchResultResponse>({...request, params});
        results = SearchResult;
    }
    items = results.map((result) => result.Metadata).filter((item) => item.type === type);
    if (request.host === musicSearchHost) {
        items = await getEnhancedItems(items, musicProviderHost);
    }
    return items;
}

async function getEnhancedItems<T extends plex.MediaObject>(
    items: readonly T[],
    host?: string
): Promise<readonly T[]> {
    if (items.length > 0) {
        const ratingKeys = items.map((item) => item.ratingKey);
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
        items = Metadata;
    }
    return items;
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
        'X-Plex-Features': 'external-media',
    };
    if (token) {
        headers['X-Plex-Token'] = token;
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

const plexApi = {
    fetch: plexFetch,
    fetchJSON,
    getEnhancedItems,
    getAccount,
    getFilters,
    getMusicLibraries,
    search,
};

export default plexApi;
