import type {
    BaseItemDto,
    BaseItemDtoQueryResult,
    EndPointInfo,
} from '@jellyfin/sdk/lib/generated-client/models';
import {Primitive} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaFilter from 'types/MediaFilter';
import MediaItem from 'types/MediaItem';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import ViewType from 'types/ViewType';
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
    viewType: ViewType.ByDecade | ViewType.ByGenre,
    itemType: ItemType
): Promise<readonly MediaFilter[]> {
    return embyApi.getFilters(viewType, itemType, jellyfinSettings);
}

async function getEndpointInfo(): Promise<EndPointInfo> {
    return embyApi.getEndpointInfo(jellyfinSettings);
}

async function getMusicLibraries(): Promise<readonly PersonalMediaLibrary[]> {
    return embyApi.getMusicLibraries(jellyfinSettings);
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

const jellyfinApi = {
    addToPlaylist,
    createPlaylist,
    delete: del,
    get,
    getEndpointInfo,
    getFilters,
    getMusicLibraries,
    post,
    getPlayableUrl,
    getPlaybackType,
};

export default jellyfinApi;
