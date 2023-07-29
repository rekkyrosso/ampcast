import type {BaseItemDtoQueryResult} from '@jellyfin/client-axios/dist/models';
import {Primitive} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaFilter from 'types/MediaFilter';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
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

async function getFilters(
    viewType: ViewType.ByDecade | ViewType.ByGenre,
    itemType: ItemType
): Promise<readonly MediaFilter[]> {
    return embyApi.getFilters(viewType, itemType, jellyfinSettings);
}

async function getMusicLibraries(): Promise<readonly PersonalMediaLibrary[]> {
    return embyApi.getMusicLibraries(jellyfinSettings);
}

async function post(path: string, params: Record<string, Primitive> = {}): Promise<void> {
    return embyApi.post(path, params, jellyfinSettings);
}

function getPlayableUrl(src: string): string {
    return embyApi.getPlayableUrl(src, jellyfinSettings);
}

const jellyfinApi = {
    delete: del,
    get,
    getFilters,
    getMusicLibraries,
    post,
    getPlayableUrl,
};

export default jellyfinApi;
