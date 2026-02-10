import type {
    BaseItemDto,
    BaseItemDtoQueryResult,
    EndPointInfo,
    PublicSystemInfo,
} from '@jellyfin/sdk/lib/generated-client';
import {Primitive} from 'type-fest';
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
import {
    canPlayNativeHls,
    canPlayVideo,
    chunk,
    getMediaObjectId,
    groupBy,
    isHlsMedia,
    uniq,
} from 'utils';
import {getPlaybackId} from 'services/mediaPlayback/playback';
import embySettings, {EmbySettings} from './embySettings';

async function del(
    path: string,
    params?: Record<string, Primitive>,
    settings?: EmbySettings
): Promise<void> {
    await embyFetch(path, params, {method: 'DELETE'}, settings);
}

async function get<T = BaseItemDtoQueryResult>(
    path: string,
    params?: Record<string, Primitive>,
    settings?: EmbySettings
): Promise<T> {
    const response = await embyFetch(path, params, {method: 'GET'}, settings);
    return response.json();
}

async function getPage(
    path: string,
    params: Record<string, Primitive>,
    settings: EmbySettings = embySettings
): Promise<Page<BaseItemDto>> {
    const data = await get(
        path,
        {
            IncludeItemTypes: 'Audio',
            Fields: 'AudioInfo,ChildCount,DateCreated,Genres,MediaSources,ParentIndexNumber,Path,ProductionYear,PremiereDate,Overview,PresentationUniqueKey,ProviderIds,UserDataPlayCount,UserDataLastPlayedDate',
            EnableUserData: true,
            Recursive: true,
            ImageTypeLimit: 1,
            EnableImageTypes: 'Primary',
            EnableTotalRecordCount: true,
            ...params,
        },
        settings
    );
    return (data as BaseItemDto).Type
        ? {
              items: [data as BaseItemDto],
              total: 1,
          }
        : {
              items: data.Items || [],
              total: data.TotalRecordCount || data.Items?.length,
          };
}

async function addToPlaylist(
    playlistId: string,
    ids: readonly string[],
    settings: EmbySettings = embySettings
): Promise<void> {
    const UserId = settings.userId;
    const chunks = chunk(uniq(ids), 300);
    for (const chunk of chunks) {
        const Ids = chunk.join(',');
        await embyFetch(`Playlists/${playlistId}/Items`, {Ids, UserId}, {method: 'POST'}, settings);
    }
}

async function createPlaylist(
    Name: string,
    Overview: string,
    ids: readonly string[],
    settings: EmbySettings = embySettings
): Promise<BaseItemDto> {
    const UserId = settings.userId;
    const Ids = ids.join(',');
    const response = await post('Playlists', {Name, Ids, UserId}, settings);
    const {Id} = await response.json();
    const path = `Items/${Id}`;
    const playlist = await get<BaseItemDto>(`Users/${UserId}/${path}`, undefined, settings);
    await post(path, {...playlist, Overview}, settings);
    return playlist;
}

async function editPlaylist(
    playlist: MediaPlaylist,
    settings: EmbySettings = embySettings
): Promise<void> {
    const userId = settings.userId;
    const playlistId = getMediaObjectId(playlist);
    const path = `Items/${playlistId}`;
    const existingPlaylist = await get(`Users/${userId}/${path}`, undefined, settings);
    if (!existingPlaylist) {
        throw Error('Playlist not found');
    }
    await post(
        path,
        {
            ...existingPlaylist,
            Name: playlist.title,
            SortName: playlist.title,
            Overview: playlist.description || '',
        },
        settings
    );
}

async function getDecades(
    itemType: ItemType,
    settings?: EmbySettings
): Promise<readonly MediaFilter[]> {
    const thisYear = new Date().getFullYear();
    const toDecade = (year: number) => Math.floor(year / 10) * 10;
    const filters = await fetchEmbyFilters('Years', itemType, settings);
    const years = filters
        .map((filter) => Number(filter.title))
        .filter((year) => year > 500 && year <= thisYear);
    const decades = groupBy(years, toDecade);
    return Object.keys(decades)
        .sort()
        .reverse()
        .map((key) => ({
            id: decades[key as any].join(','),
            title: `${key}s`,
        }));
}

const filtersCache: Record<string, readonly MediaFilter[]> = {};

async function getFilters(
    filterType: FilterType,
    itemType: ItemType,
    settings: EmbySettings = embySettings
): Promise<readonly MediaFilter[]> {
    const key = `${settings.serverId}:${itemType}:${filterType}`;
    if (!filtersCache[key]) {
        switch (filterType) {
            case FilterType.ByDecade:
                filtersCache[key] = await getDecades(itemType, settings);
                break;

            case FilterType.ByGenre:
                filtersCache[key] = await getGenres(itemType, settings);
                break;

            default:
                throw Error('Not supported');
        }
    }
    return filtersCache[key];
}

async function getGenres(
    itemType: ItemType,
    settings?: EmbySettings
): Promise<readonly MediaFilter[]> {
    return fetchEmbyFilters('Genres', itemType, settings);
}

async function fetchEmbyFilters(
    filterType: string,
    itemType: ItemType,
    settings: EmbySettings = embySettings
): Promise<readonly MediaFilter[]> {
    const params = {
        UserId: settings.userId,
        ParentId: settings.libraryId,
        IncludeItemTypes: 'Audio',
        SortBy: 'SortName',
        Recursive: true,
        Limit: 500,
        StartIndex: 0,
        EnableImages: false,
        EnableUserData: false,
        EnableTotalRecordCount: false,
    };
    switch (itemType) {
        case ItemType.Album:
            params.IncludeItemTypes = 'MusicAlbum';
            break;
        case ItemType.Artist:
            params.IncludeItemTypes = 'AlbumArtist';
            break;
    }
    const data = await get(filterType, params, settings);
    const filters = data.Items || [];
    return filters.map(({Id: id, Name: title}) => ({id: id || title, title}) as MediaFilter);
}

async function getEndpointInfo(settings: EmbySettings = embySettings): Promise<EndPointInfo> {
    const info = await get<EndPointInfo>(`System/Endpoint`, undefined, settings);
    return info;
}

async function getMusicLibraries(
    settings: EmbySettings = embySettings
): Promise<readonly PersonalMediaLibrary[]> {
    const data = await get(`Users/${settings.userId}/Views`, undefined, settings);
    const libraries =
        data.Items?.filter((section: BaseItemDto) =>
            /^(audiobooks|music|musicvideos)$/.test(section.CollectionType!)
        ) || [];
    return libraries.map(
        ({Id: id, Name: title, CollectionType: type}) => ({id, title, type}) as PersonalMediaLibrary
    );
}

async function login(
    host: string,
    Username: string,
    Pw: string,
    useProxy?: boolean,
    settings: EmbySettings = embySettings
): Promise<string> {
    const {device, deviceId} = settings;
    const isEmby = settings.serviceId === 'emby';
    const apiHost = isEmby ? `${host}/emby` : host;
    const authUrl = `${apiHost}/Users/AuthenticateByName`;
    const proxyUrl = `/proxy-login?server=${settings.serviceId}&url=${encodeURIComponent(authUrl)}`;
    const url = useProxy ? proxyUrl : authUrl;
    const authorization = `MediaBrowser Client="${__app_name__}", Version="${__app_version__}", Device="${device}", DeviceId="${deviceId}"`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Emby-Authorization': authorization,
        },
        body: useProxy ? '' : JSON.stringify({Username, Pw}),
    });

    let text = '';
    try {
        text = await response.text();
    } catch {
        // ignore
    }

    if (!response.ok) {
        // Jellyfin's response text is too generic.
        if (isEmby && text) {
            throw Error(text);
        } else {
            throw response;
        }
    }

    const auth = JSON.parse(text);
    const serverId = auth.ServerId;
    const userId = auth.User.Id;
    const token = auth.AccessToken;

    return JSON.stringify({serverId, userId, token});
}

async function post(
    path: string,
    params: Record<string, any> = {},
    settings: EmbySettings = embySettings
): Promise<Response> {
    const headers = {'Content-Type': 'application/json'};
    const body = JSON.stringify(params);
    return embyFetch(path, undefined, {method: 'POST', headers, body}, settings);
}

async function embyFetch(
    path: string,
    params: Record<string, Primitive> | undefined,
    init: RequestInit,
    settings: EmbySettings = embySettings
): Promise<Response> {
    const {apiHost, device, deviceId, token} = settings;
    if (!token) {
        throw Error('No access token');
    }
    path = params ? `${path}?${new URLSearchParams(params as any)}` : path;
    if (path.startsWith('/')) {
        path = path.slice(1);
    }
    init.headers = {
        ...init.headers,
        Accept: 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="${__app_name__}", Version="${__app_version__}", Device="${device}", DeviceId="${deviceId}", Token="${token}"`,
    };
    const response = await fetch(`${apiHost}/${path}`, init);
    if (!response.ok) {
        throw response;
    }
    return response;
}

function getPlayableUrl(item: PlayableItem, settings: EmbySettings = embySettings): string {
    const {apiHost, userId, token, deviceId} = settings;
    if (apiHost && userId && token && deviceId) {
        const [, type, id, mediaSourceId] = item.src.split(':');
        const PlaySessionId = getPlaybackId();
        if (type === 'video') {
            if (item.playbackType === PlaybackType.Direct) {
                const videoParams = new URLSearchParams({
                    MediaSourceId: mediaSourceId || id,
                    Static: 'true',
                    UserId: userId,
                    DeviceId: deviceId,
                    api_key: token,
                    PlaySessionId,
                });
                return `${apiHost}/Videos/${id}/stream?${videoParams}`;
            } else {
                const videoParams = new URLSearchParams({
                    MediaSourceId: mediaSourceId || id,
                    DeviceId: deviceId,
                    api_key: token,
                    TranscodeReasons: 'ContainerNotSupported',
                    VideoCodec: 'h264,h265,hevc',
                    AudioCodec: 'mp3,aac',
                    PlaySessionId,
                });
                return `${apiHost}/Videos/${id}/master.m3u8?${videoParams}`;
            }
        } else {
            const audioParams = new URLSearchParams({
                MaxStreamingBitrate: '140000000',
                MaxSampleRate: '48000',
                TranscodingProtocol: 'hls',
                TranscodingContainer: 'aac',
                Container: `opus,webm|opus,mp3,aac,m4a|aac${
                    canPlayNativeHls() ? ',m4a|alac' : ''
                },m4b|aac,flac,webma,webm|webma,wav,ogg`,
                AudioCodec: 'aac',
                UserId: userId,
                api_key: token,
                DeviceId: deviceId,
                EnableRedirection: 'true',
                StartTimeTicks: '0',
                PlaySessionId,
            });
            return `${apiHost}/Audio/${id}/universal?${audioParams}`;
        }
    } else {
        throw Error('Not logged in');
    }
}

async function getPlaybackType(
    item: MediaItem,
    settings: EmbySettings = embySettings
): Promise<PlaybackType> {
    try {
        if (item.mediaType === MediaType.Video) {
            const {apiHost, userId, token, deviceId} = settings;
            const [, , id, mediaSourceId] = item.src.split(':');
            const videoParams = new URLSearchParams({
                MediaSourceId: mediaSourceId || id,
                Static: 'true',
                UserId: userId,
                DeviceId: deviceId,
                api_key: token,
            });
            const url = `${apiHost}/Videos/${id}/stream?${videoParams}`;
            const directPlay = await canPlayVideo(url);
            return directPlay ? PlaybackType.Direct : PlaybackType.HLS;
        } else {
            const url = getPlayableUrl(item, settings);
            const isHls = await isHlsMedia(url);
            return isHls ? PlaybackType.HLS : PlaybackType.Direct;
        }
    } catch {
        return PlaybackType.Direct;
    }
}

async function getSystemInfo(settings: EmbySettings = embySettings): Promise<PublicSystemInfo> {
    const info = await get<PublicSystemInfo>(`System/Info/Public`, undefined, settings);
    return info;
}

const embyApi = {
    addToPlaylist,
    createPlaylist,
    delete: del,
    editPlaylist,
    get,
    getPage,
    getFilters,
    getEndpointInfo,
    getMusicLibraries,
    getPlayableUrl,
    getPlaybackType,
    getSystemInfo,
    login,
    post,
};

export default embyApi;
