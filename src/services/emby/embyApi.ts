import type {
    BaseItemDto,
    BaseItemDtoQueryResult,
    EndPointInfo,
} from '@jellyfin/client-axios/dist/models';
import {Primitive} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaFilter from 'types/MediaFilter';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import ViewType from 'types/ViewType';
import {canPlayVideo, getContentType, groupBy} from 'utils';
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

async function createPlaylist(
    Name: string,
    Overview: string,
    ids: readonly string[],
    settings: EmbySettings = embySettings
): Promise<void> {
    const UserId = settings.userId;
    const Ids = ids.join(',');
    const response = await post('Playlists', {Name, Ids, UserId}, settings);
    const {Id} = await response.json();
    const path = `Items/${Id}`;
    const playlist = await get<BaseItemDto>(`Users/${UserId}/${path}`, undefined, settings);
    await post(path, {...playlist, Overview}, settings);
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

async function getFilters(
    viewType: ViewType.ByDecade | ViewType.ByGenre,
    itemType: ItemType,
    settings?: EmbySettings
): Promise<readonly MediaFilter[]> {
    if (viewType === ViewType.ByDecade) {
        return getDecades(itemType, settings);
    } else {
        return getGenres(itemType, settings);
    }
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
    return filters.map(({Id: id, Name: title}) => ({id: id || title, title} as MediaFilter));
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
        ({Id: id, Name: title, CollectionType: type}) => ({id, title, type} as PersonalMediaLibrary)
    );
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
    const {host, device, deviceId, token} = settings;
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
    const response = await fetch(`${host}/${path}`, init);
    if (!response.ok) {
        throw response;
    }
    return response;
}

function getPlayableUrl(item: PlayableItem, settings: EmbySettings = embySettings): string {
    const {host, userId, token, deviceId, sessionId} = settings;
    if (host && userId && token && deviceId) {
        const [, type, id, mediaSourceId] = item.src.split(':');
        const PlaySessionId = `${sessionId}-${id}`;
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
                return `${host}/Videos/${id}/stream?${videoParams}`;
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
                return `${host}/Videos/${id}/master.m3u8?${videoParams}`;
            }
        } else {
            const audioParams = new URLSearchParams({
                MaxStreamingBitrate: '140000000',
                MaxSampleRate: '48000',
                TranscodingProtocol: 'hls',
                TranscodingContainer: 'aac',
                Container:
                    'opus,webm|opus,mp3,aac,m4a|aac,m4a|alac,m4b|aac,flac,webma,webm|webma,wav,ogg',
                AudioCodec: 'aac',
                UserId: userId,
                api_key: token,
                DeviceId: deviceId,
                EnableRedirection: 'true',
                StartTimeTicks: '0',
                PlaySessionId,
            });
            return `${host}/Audio/${id}/universal?${audioParams}`;
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
            const {host, userId, token, deviceId} = settings;
            const [, , id, mediaSourceId] = item.src.split(':');
            const videoParams = new URLSearchParams({
                MediaSourceId: mediaSourceId || id,
                Static: 'true',
                UserId: userId,
                DeviceId: deviceId,
                api_key: token,
            });
            const url = `${host}/Videos/${id}/stream?${videoParams}`;
            const directPlay = await canPlayVideo(url);
            return directPlay ? PlaybackType.Direct : PlaybackType.HLS;
        } else {
            const url = getPlayableUrl(item, settings);
            const contentType = (await getContentType(url)).toLowerCase();
            return contentType === 'application/x-mpegurl' ||
                contentType === 'application/vnd.apple.mpegurl'
                ? PlaybackType.HLS
                : PlaybackType.Direct;
        }
    } catch (err) {
        return PlaybackType.Direct;
    }
}

const embyApi = {
    createPlaylist,
    delete: del,
    get,
    getFilters,
    getEndpointInfo,
    getMusicLibraries,
    post,
    getPlayableUrl,
    getPlaybackType,
};

export default embyApi;
