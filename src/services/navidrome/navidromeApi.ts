import {Primitive} from 'type-fest';
import MediaFilter from 'types/MediaFilter';
import navidromeSettings from './navidromeSettings';

export interface NavidromePage<T> {
    readonly items: readonly T[];
    readonly total: number;
}

async function get<T>(path: string, params?: Record<string, Primitive>): Promise<T> {
    const response = await navidromeFetch(path, params, {method: 'GET'});
    return response.json();
}

async function post(path: string, params?: Record<string, any>): Promise<Response> {
    const headers = {'Content-Type': 'application/json'};
    const body = JSON.stringify(params);
    return navidromeFetch(path, undefined, {method: 'POST', headers, body});
}

async function addToPlaylist(playlistId: string, ids: readonly string[]): Promise<void> {
    await post(`playlist/${playlistId}/tracks`, {ids});
}

async function createPlaylist(
    name: string,
    comment: string,
    isPublic: boolean,
    ids: readonly string[]
): Promise<Navidrome.Playlist> {
    const response = await post('playlist', {name, comment, public: isPublic});
    const playlist = await response.json();
    await post(`playlist/${playlist.id}/tracks`, {ids});
    return playlist;
}

async function getGenres(): Promise<readonly MediaFilter[]> {
    const genres = await get<Navidrome.Genre[]>('genre', {_sort: 'name'});
    return genres.map(({id, name: title}) => ({id, title}));
}

async function getPage<T>(
    path: string,
    params?: Record<string, Primitive>
): Promise<NavidromePage<T>> {
    const response = await navidromeFetch(path, params, {
        method: 'GET',
        headers: {Accept: 'application/json'},
    });
    let items = await response.json();
    let total = 0;
    if (Array.isArray(items)) {
        total = Number(response.headers.get('X-Total-Count')) || items.length;
    } else {
        items = [items];
        total = 1;
    }
    return {items, total};
}

async function login(
    host: string,
    username: string,
    password: string,
    useProxy?: boolean
): Promise<string> {
    const authUrl = `${host}/auth/login`;
    const proxyUrl = `/proxy-login?server=navidrome&url=${encodeURIComponent(authUrl)}`;
    const url = useProxy ? proxyUrl : authUrl;
    const response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: useProxy ? '' : JSON.stringify({username, password}),
    });

    let data: any = {};
    try {
        data = await response.json();
    } catch {
        // ignore
    }

    if (!response.ok) {
        if (data?.error) {
            throw data.error;
        } else {
            throw response;
        }
    }

    const {token, subsonicSalt, subsonicToken, id: userId, name} = data;
    const credentials = `u=${name}&s=${subsonicSalt}&t=${subsonicToken}&v=1.16.1&c=${__app_name__}&f=json`;

    if (!token) {
        throw Error('No token returned');
    }

    return JSON.stringify({userId, token, credentials});
}

async function navidromeFetch(
    path: string,
    params: Record<string, Primitive> | undefined,
    init: RequestInit
): Promise<Response> {
    const {host, token} = navidromeSettings;
    if (!token) {
        throw Error('No access token');
    }
    path = params ? `${path}?${new URLSearchParams(params as any)}` : path;
    if (path.startsWith('/')) {
        path = path.slice(1);
    }
    init.headers = {
        ...init.headers,
        Accept: 'application/json',
        'x-nd-authorization': `Bearer ${token}`,
    };
    const response = await fetch(`${host}/api/${path}`, init);
    if (!response.ok) {
        throw response;
    }
    return response;
}

const navidromeApi = {
    addToPlaylist,
    createPlaylist,
    get,
    getGenres,
    getPage,
    login,
};

export default navidromeApi;
