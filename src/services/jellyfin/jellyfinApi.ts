import type {
    BaseItemDto,
    BaseItemDtoQueryResult,
    EndPointInfo,
    PublicSystemInfo,
    QueryFiltersLegacy,
} from '@jellyfin/sdk/lib/generated-client/models';
import {Primitive} from 'type-fest';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaFilter from 'types/MediaFilter';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import {Page} from 'types/Pager';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import {groupBy} from 'utils';
import embyApi from 'services/emby/embyApi';
import jellyfinSettings from './jellyfinSettings';

async function del(path: string, params?: Record<string, Primitive>): Promise<void> {
    return embyApi.delete(path, params, jellyfinSettings);
}

async function get<T = BaseItemDtoQueryResult>(
    path: string,
    params?: Record<string, Primitive>
): Promise<T> {
    return embyApi.get(path, params, jellyfinSettings);
}

async function getPage(
    path: string,
    params: Record<string, Primitive>
): Promise<Page<BaseItemDto>> {
    const data = await embyApi.get(
        path,
        {
            IncludeItemTypes: 'Audio',
            Fields: 'AudioInfo,ChildCount,DateCreated,Genres,MediaSources,Path,ProviderIds,Overview',
            EnableUserData: true,
            Recursive: true,
            ImageTypeLimit: 1,
            EnableImageTypes: 'Primary',
            EnableTotalRecordCount: true,
            ...params,
        },
        jellyfinSettings
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

async function addToPlaylist(playlistId: string, ids: readonly string[]): Promise<void> {
    return embyApi.addToPlaylist(playlistId, ids, jellyfinSettings);
}

async function createPlaylist(
    name: string,
    description: string,
    ids: readonly string[]
): Promise<BaseItemDto> {
    return embyApi.createPlaylist(name, description, ids, jellyfinSettings);
}

async function editPlaylist(playlist: MediaPlaylist): Promise<void> {
    return embyApi.editPlaylist(playlist, jellyfinSettings);
}

const cachedFilters: Record<string, readonly MediaFilter[]> = {};

async function getFilters(
    filterType: FilterType,
    itemType: ItemType
): Promise<readonly MediaFilter[]> {
    const cacheKey = `${filterType}-${itemType}`;
    if (!cachedFilters[cacheKey]) {
        const params = {
            UserId: jellyfinSettings.userId,
            ParentId: jellyfinSettings.libraryId,
            IncludeItemTypes: 'Audio',
        };
        switch (itemType) {
            case ItemType.Album:
                params.IncludeItemTypes = 'MusicAlbum';
                break;
            case ItemType.Artist:
                params.IncludeItemTypes = 'AlbumArtist';
                break;
        }

        const data = await get<QueryFiltersLegacy>('Items/Filters', params);

        switch (filterType) {
            case FilterType.ByGenre:
                cachedFilters[cacheKey] = data.Genres?.map((title) => ({id: title, title})) || [];
                break;

            case FilterType.ByDecade: {
                const thisYear = new Date().getFullYear();
                const toDecade = (year: number) => Math.floor(year / 10) * 10;
                const years = data.Years?.filter((year) => year > 500 && year <= thisYear) || [];
                const decades = groupBy(years, toDecade);
                cachedFilters[cacheKey] = Object.keys(decades)
                    .sort()
                    .reverse()
                    .map((key) => ({
                        id: decades[key as any].join(','),
                        title: `${key}s`,
                    }));
                break;
            }

            default:
                throw Error('Not supported');
        }
    }
    return cachedFilters[cacheKey];
}

async function getEndpointInfo(): Promise<EndPointInfo> {
    return embyApi.getEndpointInfo(jellyfinSettings);
}

async function getMusicLibraries(): Promise<readonly PersonalMediaLibrary[]> {
    return embyApi.getMusicLibraries(jellyfinSettings);
}

async function login(
    host: string,
    userName: string,
    password: string,
    useProxy?: boolean
): Promise<string> {
    return embyApi.login(host, userName, password, useProxy, jellyfinSettings);
}

async function post(path: string, params: Record<string, Primitive> = {}): Promise<Response> {
    return embyApi.post(path, params, jellyfinSettings);
}

function getPlayableUrl(item: PlayableItem): string {
    return embyApi.getPlayableUrl(item, jellyfinSettings);
}

async function getPlaybackType(item: MediaItem): Promise<PlaybackType> {
    return embyApi.getPlaybackType(item, jellyfinSettings);
}

async function getSystemInfo(): Promise<PublicSystemInfo> {
    return embyApi.getSystemInfo(jellyfinSettings);
}

const jellyfinApi = {
    addToPlaylist,
    createPlaylist,
    delete: del,
    editPlaylist,
    get,
    getPage,
    getEndpointInfo,
    getFilters,
    getMusicLibraries,
    getPlayableUrl,
    getPlaybackType,
    getSystemInfo,
    login,
    post,
};

export default jellyfinApi;
