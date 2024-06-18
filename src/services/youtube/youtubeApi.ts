import {Except} from 'type-fest';
import youtubeSettings from './youtubeSettings';

interface YouTubeRequest {
    path: string;
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    params?: Record<string, any>;
    body?: any;
}

const youtubeApiHost = 'https://www.googleapis.com/youtube/v3';

async function get<T = any>({headers, ...request}: Except<YouTubeRequest, 'method'>): Promise<T> {
    headers = {...headers, Accept: 'application/json'};
    return youtubeFetch({method: 'GET', headers, ...request});
}

async function post<T = any>({
    headers,
    body,
    ...request
}: Except<YouTubeRequest, 'method'>): Promise<T> {
    if (body) {
        headers = {...headers, 'Content-Type': 'application/json'};
        body = JSON.stringify(body);
    }
    return youtubeFetch({method: 'POST', headers, body, ...request});
}

async function youtubeFetch<T = any>({
    path,
    method,
    params,
    headers,
    body,
}: YouTubeRequest): Promise<T> {
    const token = youtubeSettings.token;
    if (!token) {
        throw Error('No access token');
    }

    path = params ? `${path}?${new URLSearchParams(params)}` : path;
    if (path.startsWith('/')) {
        path = path.slice(1);
    }

    const init: RequestInit = {
        method,
        headers: {
            ...headers,
            Authorization: `Bearer ${token}`,
        },
        body,
    };

    const response = await fetch(`${youtubeApiHost}/${path}`, init);

    if (!response.ok) {
        throw response;
    }

    return response.json();
}

const youtubeApi = {
    get,
    post,
};

export default youtubeApi;
