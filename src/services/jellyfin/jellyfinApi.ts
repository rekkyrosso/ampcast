import jellyfinSettings from './jellyfinSettings';

console.log('module::jellyfinApi');

async function get(path: string, params: Record<string, string>): Promise<Response> {
    return fetch(`${path}?${new URLSearchParams(params)}`, {method: 'GET'});
}

async function post(path: string, params: any): Promise<Response> {
    const headers = {'Content-Type': 'application/json'};
    const body = JSON.stringify(params);
    return fetch(path, {method: 'POST', headers, body});
}

async function fetch(path: string, init: RequestInit): Promise<Response> {
    const {device, deviceId, token} = jellyfinSettings;
    init.headers = {
        ...init.headers,
        ...{
            ['X-Emby-Authorization']: `MediaBrowser Client="${__app_name__}", Version="${__app_version__}", Device="${device}", DeviceId="${deviceId}", Token="${token}"`,
        },
    };

    return window.fetch(`${jellyfinSettings.host}/${path}`, init);
}

export function getPlayableUrlFromSrc(src: string): string {
    const [, , trackId] = src.split(':');
    const trackParams = new URLSearchParams({
        MaxStreamingBitrate: '140000000',
        MaxSampleRate: '48000',
        TranscodingProtocol: 'hls',
        TranscodingContainer: 'ts',
        Container: 'opus,webm|opus,mp3,aac,m4a|aac,m4b|aac,flac,webma,webm|webma,wav,ogg',
        AudioCodec: 'aac',
        static: 'true',
        UserId: jellyfinSettings.userId,
        api_key: jellyfinSettings.token,
        DeviceId: jellyfinSettings.deviceId,
    });
    return `${jellyfinSettings.host}/Audio/${trackId}/universal?${trackParams}`;
}

const jellyfinApi = {
    get,
    post,
    getPlayableUrlFromSrc,
};

export default jellyfinApi;
