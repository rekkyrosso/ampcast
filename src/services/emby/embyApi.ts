import type {BaseItemDto, BaseItemDtoQueryResult} from '@jellyfin/client-axios/dist/models';
import {Primitive} from 'type-fest';
import embySettings, {EmbyLibrary, EmbySettings} from './embySettings';

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

async function getMusicLibraries(
    settings: EmbySettings = embySettings
): Promise<readonly EmbyLibrary[]> {
    const data = await get(`Users/${settings.userId}/Views`, undefined, settings);
    const libraries =
        data.Items?.filter((section: BaseItemDto) =>
            /^(audiobooks|music|musicvideos)$/.test(section.CollectionType!)
        ) || [];
    return libraries.map(
        ({Id: id, Name: title, CollectionType: type}) => ({id, title, type} as EmbyLibrary)
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
    getMusicLibraries,
    post,
    getPlayableUrlFromSrc,
};

export default embyApi;
