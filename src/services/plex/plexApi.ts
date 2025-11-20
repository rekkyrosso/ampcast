import unidecode from 'unidecode';
import {Except} from 'type-fest';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaFilter from 'types/MediaFilter';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import {Page} from 'types/Pager';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import {NoMusicLibraryError} from 'services/errors';
import {browser, canPlayMedia, groupBy, partition, uniq, uniqBy} from 'utils';
import plexItemType from './plexItemType';
import plexMediaType from './plexMediaType';
import plexSettings from './plexSettings';
import {createMediaObjects} from './plexUtils';

export interface PlexRequest {
    path: string;
    method?: 'HEAD' | 'GET' | 'PUT' | 'DELETE' | 'POST';
    headers?: Record<string, string>;
    params?: Record<string, any>;
    body?: any;
    host?: string;
    token?: string;
    timeout?: number; // MS
}

export const apiHost = `https://plex.tv/api/v2`;

const emptyRatingObject: Except<plex.RatingObject, 'type'> = {
    addedAt: 0,
    art: '',
    attribution: '',
    deletedAt: 0,
    guid: '',
    index: 0,
    key: '',
    lastViewedAt: 0,
    ratingKey: '',
    userRating: 0,
    summary: '',
    thumb: '',
    title: '',
    titleSort: '',
    updatedAt: 0,
    viewCount: 0,
};

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
    token = plexSettings.accessToken,
    timeout,
}: PlexRequest): Promise<Response> {
    if (!host) {
        throw Error(`No Plex connection.`);
    }

    path = params ? `${path}?${new URLSearchParams(params)}` : path;
    if (path.startsWith('/')) {
        path = path.slice(1);
    }

    const init: RequestInit = {
        method,
        headers: {
            ...headers,
            ...getHeaders(token),
        },
        body,
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

async function getPage<T extends plex.MediaObject>(
    plexRequest: PlexRequest,
    offset: number,
    count: number
): Promise<Page<T>> {
    const {headers, ...rest} = plexRequest;
    const {path, params} = rest;
    const isSearchPager =
        path.endsWith('/all') &&
        !!(params?.title || params?.originalTitle) &&
        params.type !== plexMediaType.Playlist &&
        !params.extraType;
    const request = {
        ...rest,
        headers: {
            ...headers,
            'X-Plex-Container-Size': String(count),
            'X-Plex-Container-Start': String(offset),
        },
    };
    let items: readonly T[];
    let total = 0;
    if (isSearchPager && offset === 0) {
        const page = await search(request);
        items = page.items as T[];
        total = page.total || items.length;
    } else {
        const {
            MediaContainer: {Metadata = [], size, totalSize},
        } = await fetchJSON<plex.MetadataResponse>(request);
        items = Metadata as T[];
        total = totalSize || size;
    }
    return {items, total};
}

async function addToPlaylist(playlist: MediaPlaylist, items: readonly MediaItem[]): Promise<void> {
    const ratingKey = getRatingKeyFromSrc(playlist);
    const path = `/playlists/${ratingKey}/items`;
    if (items.length > 0) {
        const uri = toPlexUri(items);
        await fetchJSON<plex.Playlist>({method: 'PUT', path, params: {uri}});
    }
}

async function createPlaylist(
    title: string,
    summary: string,
    items: readonly MediaItem[]
): Promise<plex.Playlist> {
    const type = 'audio';
    const uri = toPlexUri(items);
    const {
        MediaContainer: {Metadata: [playlist] = []},
    } = await fetchJSON<plex.MetadataResponse>({
        method: 'POST',
        path: '/playlists',
        params: {type, title, uri, smart: 0},
    });
    // Need to do these calls sequentially.
    if (summary) {
        await plexFetch({
            method: 'PUT',
            path: `/playlists/${playlist.ratingKey}`,
            params: {summary},
        });
        (playlist as any).summary = summary;
    }
    return playlist as plex.Playlist;
}

async function editPlaylist(playlist: MediaPlaylist): Promise<void> {
    const [, , ratingKey] = playlist.src.split(':');
    await plexFetch({
        method: 'PUT',
        path: `/playlists/${ratingKey}`,
        params: {
            title: playlist.title,
            summary: playlist.description || '',
        },
    });
}

async function createPlayQueue(
    {src}: {src: string},
    params: Record<string, any> = {}
): Promise<plex.PlayQueue> {
    const [, type, ratingKey] = src.split(':');
    const key = type === 'radio' ? ratingKey : `/library/metadata/${ratingKey}`;
    const {MediaContainer: playQueue} = await fetchJSON<plex.PlayQueueResponse>({
        path: '/playQueues',
        method: 'POST',
        params: {
            key,
            type: 'music',
            uri: `server://${plexSettings.serverId}/com.plexapp.plugins.library${key}`,
            continuous: '0',
            repeat: '0',
            own: '1',
            ...params,
        },
    });
    return playQueue;
}

async function getPlayQueue(id: number): Promise<plex.PlayQueue> {
    const {MediaContainer: playQueue} = await fetchJSON<plex.PlayQueueResponse>({
        path: `/playQueues/${id}`,
        params: {repeat: '0', own: '1'},
    });
    return playQueue;
}

function toPlexUri(items: readonly MediaItem[]): string {
    const ids = items.map(getRatingKeyFromSrc).join(',');
    return `server://${plexSettings.serverId}/com.plexapp.plugins.library/library/metadata/${ids}`;
}

async function getServers(token = plexSettings.accessToken): Promise<readonly plex.Device[]> {
    const devices = await fetchJSON<plex.Device[]>({
        host: apiHost,
        path: '/resources',
        params: {
            includeHttps: 1,
            includeIPv6: 1,
            includeRelay: 1,
        },
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
    token = plexSettings.accessToken
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

async function getFilters(
    filterType: FilterType,
    itemType: ItemType
): Promise<readonly MediaFilter[]> {
    switch (filterType) {
        case FilterType.ByCountry:
            return getPlexFilters(itemType, 'country');

        case FilterType.ByDecade:
            return getPlexFilters(itemType, 'decade');

        case FilterType.ByGenre:
            return getPlexFilters(itemType, 'genre');

        case FilterType.ByMood:
            return getPlexFilters(itemType, 'mood');

        case FilterType.ByStyle:
            return getPlexFilters(itemType, 'style');

        case FilterType.ByPlexStationType:
            return getRadioStationFilters();

        default:
            throw Error('Not supported');
    }
}

const cachedFilters: Record<string, readonly MediaFilter[]> = {};
async function getPlexFilters(
    itemType: ItemType,
    filterName: string
): Promise<readonly MediaFilter[]> {
    const cacheKey = `${itemType}-${filterName}`;
    if (!cachedFilters[cacheKey]) {
        const type = getPlexMediaType(itemType);
        const {
            MediaContainer: {Directory: filters},
        } = await fetchJSON<plex.DirectoryResponse>({
            path: getMusicLibraryPath(filterName),
            params: {type},
        });
        cachedFilters[cacheKey] = filters.map(({key: id, title}) => ({id, title}));
    }
    return cachedFilters[cacheKey];
}

async function getRadioStationFilters(): Promise<readonly MediaFilter[]> {
    const {directories} = await getRadioStations();
    return [
        {id: '', title: 'General Radio'},
        ...directories.map((directory) => ({
            id: directory.key,
            title: directory.title,
        })),
    ];
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

async function search<T extends plex.RatingObject>(request: PlexRequest): Promise<Page<T>> {
    if (request.params?.originalTitle) {
        return searchByOriginalTitle(request) as Promise<Page<T>>;
    }
    const pageSize = Number(request.headers?.['X-Plex-Container-Size']) || 100;
    const itemType = getPlexItemTypeFromMediaType(request.params?.type);
    const query = request.params?.title || '';
    const [
        {
            MediaContainer: {SearchResult = []},
        },
        {
            MediaContainer: {Metadata: libraryItems = [], size, totalSize},
        },
        {
            MediaContainer: {Metadata: extraTracks = []},
        },
    ] = await Promise.all([
        plexApi.fetchJSON<plex.SearchResultResponse<T>>({
            path: `/library/search`,
            params: {query, limit: pageSize, searchTypes: 'music'},
        }),
        plexApi.fetchJSON<plex.MetadataResponse<T>>(request),
        itemType === plexItemType.Artist
            ? plexApi.fetchJSON<plex.MetadataResponse<plex.Track>>({
                  ...request,
                  params: {
                      title: query,
                      type: plexMediaType.Track,
                  },
              })
            : Promise.resolve({MediaContainer: {Metadata: []}}),
    ]);
    const total = totalSize || size;
    if (total < pageSize) {
        const decode = (name: string) => unidecode(name).toLowerCase();
        const decodedQuery = decode(query);
        const searchItems = SearchResult.map((result) => result.Metadata).filter(
            (item) =>
                item &&
                item.type === itemType &&
                item.librarySectionTitle === plexSettings.libraryTitle
        );
        // Supplement the underlying request with search results from other queries.
        let items = uniqBy('ratingKey', searchItems.concat(libraryItems));
        if (itemType === plexItemType.Track) {
            const extraArtists = SearchResult.filter((result) => result.score > 0.3)
                .map((result) => result.Metadata)
                .filter(
                    (item) =>
                        item &&
                        item.type === plexItemType.Artist &&
                        item.librarySectionTitle === plexSettings.libraryTitle
                )
                .slice(0, 5);
            if (extraArtists.length > 0) {
                const extraItems = await Promise.all([
                    ...extraArtists.map((extraArtist) =>
                        plexApi.fetchJSON<plex.MetadataResponse<plex.Track>>({
                            ...request,
                            path: getMusicLibraryPath(),
                            params: {'artist.id': extraArtist.ratingKey, type: plexMediaType.Track},
                        })
                    ),
                ]);
                const tracks = extraItems
                    .map(({MediaContainer: {Metadata = []}}) => Metadata)
                    .flat() as T[];
                items = uniqBy('ratingKey', items.concat(tracks));
            }
        } else if (itemType === plexItemType.Artist) {
            const artistNames = uniq(items.map((item) => item.title));
            const extraArtistNames = Object.keys(groupBy(extraTracks, 'originalTitle'))
                .filter((key) => key && key !== 'undefined')
                .filter(
                    (name) => !artistNames.includes(name) && decode(name).includes(decodedQuery)
                );
            const extraArtists: plex.Artist[] = extraArtistNames.map((artist) => ({
                ...emptyRatingObject,
                type: 'artist',
                title: artist,
            }));
            items = items
                // Sort the found Plex artists.
                .sort((a, b) => a.title.localeCompare(b.title))
                // Then add the sorted extra (synthetic) artists.
                .concat(extraArtists.sort((a, b) => a.title.localeCompare(b.title)) as T[]);
        }

        return {items, total: items.length, atEnd: true};
    } else {
        // Use the existing query. There are lots of results and we need pagination.
        return {items: libraryItems, total};
    }
}

async function searchByOriginalTitle(request: PlexRequest): Promise<Page<plex.Track>> {
    let items: readonly plex.Track[];
    const originalTitle = request.params?.originalTitle || '';
    // This whole function exists because the Plex API doesn't handle commas very well.
    if (originalTitle.includes(',')) {
        const pageSize = Number(request.headers?.['X-Plex-Container-Size']) || 100;
        const searchItems = await librarySearch<plex.Track>(
            plexItemType.Track,
            originalTitle,
            pageSize
        );
        items = searchItems.filter((item) => item.originalTitle === originalTitle);
    } else {
        const {
            MediaContainer: {Metadata = []},
        } = await fetchJSON<plex.MetadataResponse<plex.Track>>(request);
        items = Metadata;
    }
    return {items, total: items.length, atEnd: true};
}

async function librarySearch<T extends plex.RatingObject>(
    type: plexItemType,
    query: string,
    limit = 100
): Promise<readonly T[]> {
    limit = Math.max(100, limit);
    const {
        MediaContainer: {SearchResult = []},
    } = await plexApi.fetchJSON<plex.SearchResultResponse<T>>({
        path: `/library/search`,
        params: {query, limit, searchTypes: 'music'},
    });
    return SearchResult.map((result) => result.Metadata).filter(
        (item) =>
            item && item.type === type && item.librarySectionTitle === plexSettings.libraryTitle
    );
}

async function getMetadata<T extends plex.RatingObject>(
    ratingKeys: readonly string[]
): Promise<readonly T[]> {
    if (ratingKeys.length === 0) {
        return [];
    }
    const {
        MediaContainer: {Metadata = []},
    } = await fetchJSON<plex.MetadataResponse<T>>({
        path: `/library/metadata/${ratingKeys.join(',')}`,
        headers: {
            'X-Plex-Container-Start': '0',
            'X-Plex-Container-Size': String(ratingKeys.length),
        },
    });
    return Metadata;
}

export interface PlexRadioStations {
    readonly defaults: readonly MediaItem[];
    readonly directories: readonly plex.MediaObject[];
}

let cachedRadioStations: PlexRadioStations | undefined;

async function getRadioStations(): Promise<PlexRadioStations> {
    if (!cachedRadioStations) {
        const {
            MediaContainer: {Hub: hubs},
        } = await fetchJSON<plex.HubsResponse>({
            path: `/hubs/sections/${getMusicLibraryId()}`,
            params: {
                includeStations: 1,
                includeStationDirectories: 1,
            },
        });
        const stations = hubs.find((hub) => hub.type === 'station')?.Metadata;
        if (!stations) {
            throw Error('Radio stations not found');
        }
        const [playlists, directories] = partition(
            stations,
            (station) => station.type === 'playlist'
        );
        cachedRadioStations = {
            defaults: createMediaObjects(playlists),
            directories,
        };
    }
    return cachedRadioStations;
}

function getPlayableUrl(item: PlayableItem): string {
    const {host, accessToken} = plexSettings;
    if (host && accessToken) {
        if (item.playbackType === PlaybackType.Direct) {
            const [src] = item.srcs || [];
            if (!src) {
                throw Error('No playable source');
            }
            return `${host}${src}?X-Plex-Token=${accessToken}`;
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
                ...getHeaders(accessToken),
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
        const {host, accessToken} = plexSettings;
        const [src] = item.srcs || [];
        const url = `${host}${src}?X-Plex-Token=${accessToken}`;
        const directPlay = await canPlayMedia(
            item.mediaType === MediaType.Video ? 'video' : 'audio',
            url
        );
        return directPlay ? PlaybackType.Direct : PlaybackType.HLS;
    } catch {
        return PlaybackType.Direct;
    }
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

export function getPlexItemTypeFromMediaType(itemType: plexMediaType): plexItemType | undefined {
    switch (itemType) {
        case plexMediaType.Album:
            return plexItemType.Album;

        case plexMediaType.Artist:
            return plexItemType.Artist;

        case plexMediaType.Track:
            return plexItemType.Track;

        case plexMediaType.Playlist:
            return plexItemType.Playlist;

        default:
            // They don't really map one to one.
            return undefined;
    }
}

function getRatingKeyFromSrc({src}: {src: string}): string {
    const [, , ratingKey] = src.split(':');
    return ratingKey;
}

const plexApi = {
    addToPlaylist,
    createPlaylist,
    createPlayQueue,
    editPlaylist,
    getPlayQueue,
    fetch: plexFetch,
    fetchJSON,
    getFilters,
    getHeaders,
    getMetadata,
    getMusicLibraries,
    getPage,
    getPlayableUrl,
    getPlaybackType,
    getRadioStations,
    getServers,
    search,
};

export default plexApi;
