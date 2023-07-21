import type {BaseItemDto, BaseItemDtoQueryResult} from '@jellyfin/client-axios/dist/models';
import {Primitive} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaFilter from 'types/MediaFilter';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import ViewType from 'types/ViewType';
import embySettings, {EmbySettings} from './embySettings';
import {groupBy} from 'utils';

async function del(
    path: string,
    params?: Record<string, Primitive>,
    settings?: EmbySettings
): Promise<void> {
    await embyFetch(path, params, {method: 'DELETE'}, settings);
}

async function get<T extends BaseItemDtoQueryResult>(
    path: string,
    params?: Record<string, Primitive>,
    settings?: EmbySettings
): Promise<T> {
    const response = await embyFetch(
        path,
        params,
        {
            method: 'GET',
            headers: {Accept: 'application/json'},
        },
        settings
    );
    const data = await response.json();
    return data;
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
    params: Record<string, Primitive> = {},
    settings: EmbySettings = embySettings
): Promise<void> {
    const headers = {'Content-Type': 'application/json'};
    const body = JSON.stringify(params);
    await embyFetch(path, undefined, {method: 'POST', headers, body}, settings);
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
        'X-Emby-Authorization': `MediaBrowser Client="${__app_name__}", Version="${__app_version__}", Device="${device}", DeviceId="${deviceId}", Token="${token}"`,
    };
    const response = await fetch(`${host}/${path}`, init);
    if (!response.ok) {
        throw response;
    }
    return response;
}

function getPlayableUrlFromSrc(src: string, settings: EmbySettings = embySettings): string {
    const {host, userId, token, deviceId} = settings;
    if (host && userId && token && deviceId) {
        const [, type, id, mediaSourceId] = src.split(':');
        if (type === 'video') {
            const videoParams = new URLSearchParams({
                MediaSourceId: mediaSourceId || id,
                Static: 'true',
                UserId: userId,
                DeviceId: deviceId,
                api_key: token,
            });
            return `${host}/Videos/${id}/stream?${videoParams}`;
        } else {
            const audioParams = new URLSearchParams({
                MaxStreamingBitrate: '140000000',
                MaxSampleRate: '48000',
                TranscodingProtocol: 'hls',
                TranscodingContainer: 'ts',
                Container:
                    'opus,webm|opus,mp3,aac,m4a|aac,m4a|alac,m4b|aac,flac,webma,webm|webma,wav,ogg',
                AudioCodec: 'aac',
                Static: 'true',
                UserId: userId,
                api_key: token,
                DeviceId: deviceId,
            });
            return `${host}/Audio/${id}/universal?${audioParams}`;
        }
    } else {
        throw Error('Not logged in');
    }
}

const embyApi = {
    delete: del,
    get,
    getFilters,
    getMusicLibraries,
    post,
    getPlayableUrlFromSrc,
};

export default embyApi;
