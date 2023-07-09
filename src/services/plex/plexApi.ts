import {browser} from 'utils';
import plexSettings from './plexSettings';

interface PlexRequest {
    path: string;
    method?: 'GET' | 'PUT' | 'POST' | 'HEAD';
    headers?: Record<string, string>;
    params?: Record<string, any>;
    body?: any;
    host?: string;
    token?: string;
    keepalive?: boolean;
}

async function fetchJSON<T = any>({
    headers,
    body,
    ...rest
}: PlexRequest): Promise<T> {
    headers = {...headers, Accept: 'application/json'};
    if (body) {
        headers = {...headers, 'Content-Type': 'application/json'};
        body = JSON.stringify(body);
    }
    const response = await plexFetch({
        headers,
        body,
        ...rest,
    });
    return response.json();
}

async function plexFetch({
    host = plexSettings.host,
    path,
    method = 'GET',
    params,
    headers,
    body,
    token,
    keepalive,
}: PlexRequest): Promise<Response> {
    if (!host) {
        throw Error(`No Plex connection.`);
    }

    path = params ? `${path}?${new URLSearchParams(params)}` : path;
    if (!path.startsWith('/')) {
        path = `/${path}`;
    }

    if (!token) {
        token = host === plexSettings.host ? plexSettings.serverToken : plexSettings.userToken;
    }

    const response = await fetch(`${host}${path}`, {
        method,
        headers: {
            ...headers,
            ...getHeaders(token),
        },
        body,
        keepalive,
    });

    if (!response.ok) {
        throw response;
    }

    return response;
}

function getPlayableUrlFromSrc(src: string): string {
    const {host, serverToken} = plexSettings;
    if (host && serverToken) {
        const [, , key] = src.split(':');
        return `${host}${key}?X-Plex-Token=${serverToken}`;
    } else {
        throw Error('Not logged in');
    }
}

function getHeaders(token: string): Record<string, string> {
    const headers: Record<string, string> = {
        // This app
        'X-Plex-Product': __app_name__,
        'X-Plex-Version': __app_version__,
        // This browser
        'X-Plex-Platform': browser.displayName,
        'X-Plex-Platform-Version': browser.version,
        'X-Plex-Device': browser.os,
        'X-Plex-Device-Name': browser.displayName,
        // This particular browser
        'X-Plex-Client-Identifier': plexSettings.clientId,
        // Other
        'X-Plex-Model': 'hosted',
        'Accept-Encoding': 'gzip, deflate, br',
    };
    if (token) {
        headers['X-Plex-Token'] = token;
    }
    return headers;
}

const plexApi = {
    fetch: plexFetch,
    fetchJSON,
    getPlayableUrlFromSrc,
};

export default plexApi;
