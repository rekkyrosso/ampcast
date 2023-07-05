import type {BaseItemDtoQueryResult} from '@jellyfin/client-axios/dist/models';
import {Primitive} from 'type-fest';
import embyApi from 'services/emby/embyApi';
import {EmbyLibrary} from 'services/emby/embySettings';
import jellyfinSettings from './jellyfinSettings';

console.log('module::jellyfinApi');

async function del(path: string, params?: Record<string, Primitive>): Promise<void> {
    return embyApi.delete(path, params, jellyfinSettings);
}

async function get<T extends BaseItemDtoQueryResult>(
    path: string,
    params?: Record<string, Primitive>
): Promise<T> {
    return embyApi.get(path, params, jellyfinSettings);
}

async function getMusicLibraries(): Promise<readonly EmbyLibrary[]> {
    return embyApi.getMusicLibraries(jellyfinSettings);
}

async function post(path: string, params: Record<string, Primitive> = {}): Promise<void> {
    return embyApi.post(path, params, jellyfinSettings);
}

function getPlayableUrlFromSrc(src: string): string {
    return embyApi.getPlayableUrlFromSrc(src, jellyfinSettings);
}

const jellyfinApi = {
    delete: del,
    get,
    getMusicLibraries,
    post,
    getPlayableUrlFromSrc,
};

export default jellyfinApi;
