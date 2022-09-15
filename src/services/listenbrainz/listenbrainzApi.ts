import listenbrainzSettings from './listenbrainzSettings';

console.log('module::listenbrainzApi');

// const host = `http://cors-anywhere.herokuapp.com/https://api.listenbrainz.org`;
const host = `https://api.listenbrainz.org`;

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
    if (params) {
        path = `${path}?${new URLSearchParams(params)}`;
    }
    const response = await fetch(path, {method: 'GET'});
    if (!response.ok) {
        throw response;
    }
    const data = await response.json();
    return data;
}

async function post(path: string, params: any): Promise<Response> {
    const headers = {'Content-Type': 'application/json'};
    const body = JSON.stringify(params);
    return fetch(path, {method: 'POST', headers, body});
}

async function fetch(path: string, init: RequestInit): Promise<Response> {
    init.headers = {
        ...init.headers,
        Authorization: `Token ${listenbrainzSettings.token}`,
    };

    if (!path.startsWith('/')) {
        path = `/${path}`;
    }

    return window.fetch(`${host}${path}`, init);
}

const listenbrainzApi = {
    host,
    get,
    post,
};

export default listenbrainzApi;
