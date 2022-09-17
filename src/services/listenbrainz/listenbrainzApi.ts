import listenbrainzSettings from './listenbrainzSettings';

console.log('module::listenbrainzApi');

const host = `https://api.listenbrainz.org/1`;

async function get<T>(path: string, params?: Record<string, string>, signed = false): Promise<T> {
    if (params) {
        path = `${path}?${new URLSearchParams(params)}`;
    }
    const response = await fetch(path, {method: 'GET'}, signed);
    const data = await response.json();
    return data;
}

async function post(path: string, params: any): Promise<Response> {
    const headers = {'Content-Type': 'application/json'};
    const body = JSON.stringify(params);
    return fetch(path, {method: 'POST', headers, body}, true);
}

async function fetch(path: string, init: RequestInit, signed = false): Promise<Response> {
    if (signed) {
        init.headers = {
            ...init.headers,
            Authorization: `Token ${listenbrainzSettings.token}`,
        };
    }

    if (path.startsWith('/')) {
        path = path.slice(1);
    }

    const response = await window.fetch(`${host}/${path}`, init);

    if (!response.ok) {
        throw response;
    }

    return response;
}

const listenbrainzApi = {
    host,
    stats: {
        async get(path: string, params?: any): Promise<Response> {
            return get(`stats/user/${listenbrainzSettings.userId}/${path}`, params);
        },
    },
    user: {
        async get(path: string, params?: any): Promise<Response> {
            return get(`user/${listenbrainzSettings.userId}/${path}`, params, true);
        },
    },
    get,
    post,
};

export default listenbrainzApi;
