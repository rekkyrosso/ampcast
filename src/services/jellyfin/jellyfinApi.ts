import type {
    BaseItemDto,
    BaseItemDtoQueryResult,
    EndPointInfo,
    PublicSystemInfo,
} from '@jellyfin/sdk/lib/generated-client/models';
import {Primitive} from 'type-fest';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaFilter from 'types/MediaFilter';
import MediaItem from 'types/MediaItem';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import embyApi from 'services/emby/embyApi';
import jellyfinSettings from './jellyfinSettings';

async function del(path: string, params?: Record<string, Primitive>): Promise<void> {
    return embyApi.delete(path, params, jellyfinSettings);
}

async function get<T extends BaseItemDtoQueryResult>(
    path: string,
    params?: Record<string, Primitive>
): Promise<T> {
    return embyApi.get(path, params, jellyfinSettings);
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

async function getFilters(
    filterType: FilterType,
    itemType: ItemType
): Promise<readonly MediaFilter[]> {
    return embyApi.getFilters(filterType, itemType, jellyfinSettings);
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
    get,
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
