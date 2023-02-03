import {Primitive} from 'type-fest';
import jellyfinSettings from './jellyfinSettings';

console.log('module::jellyfinApi');

async function del(path: string, params: Record<string, Primitive> = {}): Promise<Response> {
    return fetch(`${path}?${new URLSearchParams(params as any)}`, {method: 'DELETE'});
}

async function get(path: string, params: Record<string, Primitive> = {}): Promise<Response> {
    return fetch(`${path}?${new URLSearchParams(params as any)}`, {method: 'GET'});
}

async function post(path: string, params: Record<string, Primitive> = {}): Promise<Response> {
    const headers = {'Content-Type': 'application/json'};
    const body = JSON.stringify(params);
    return fetch(path, {method: 'POST', headers, body});
}

async function fetch(path: string, init: RequestInit): Promise<Response> {
    const {device, deviceId, token} = jellyfinSettings;
    if (!token) {
        throw Error('No access token.');
    }
    if (path.startsWith('/')) {
        path = path.slice(1);
    }
    init.headers = {
        ...init.headers,
        'X-Emby-Authorization': `MediaBrowser Client="${__app_name__}", Version="${__app_version__}", Device="${device}", DeviceId="${deviceId}", Token="${token}"`,
    };

    return window.fetch(`${jellyfinSettings.host}/${path}`, init);
}

function getPlayableUrlFromSrc(src: string): string {
    const {host, userId, token, deviceId} = jellyfinSettings;
    if (host && userId && token && deviceId) {
        const [, , trackId] = src.split(':');
        const trackParams = new URLSearchParams({
            MaxStreamingBitrate: '140000000',
            MaxSampleRate: '48000',
            TranscodingProtocol: 'hls',
            TranscodingContainer: 'ts',
            Container:
                'opus,webm|opus,mp3,aac,m4a|aac,m4a|alac,m4b|aac,flac,webma,webm|webma,wav,ogg',
            AudioCodec: 'aac',
            static: 'true',
            UserId: userId,
            api_key: token,
            DeviceId: deviceId,
        });
        return `${host}/Audio/${trackId}/universal?${trackParams}`;
    } else {
        throw Error('Not logged in.');
    }
}

const jellyfinApi = {
    delete: del,
    get,
    post,
    getPlayableUrlFromSrc,
};

export default jellyfinApi;
