import {Primitive} from 'type-fest';
import MediaFilter from 'types/MediaFilter';
import ViewType from 'types/ViewType';
import subsonicApi from 'services/subsonic/subsonicApi';
import navidromeSettings from './navidromeSettings';

export interface NavidromePage<T> {
    readonly items: readonly T[];
    readonly total: number;
}

async function get<T>(path: string, params?: Record<string, Primitive>): Promise<T> {
    const response = await navidromeFetch(path, params, {
        method: 'GET',
        headers: {Accept: 'application/json'},
    });
    const data = await response.json();
    return data;
}

async function getFilters(
    viewType: ViewType.ByDecade | ViewType.ByGenre
): Promise<readonly MediaFilter[]> {
    if (viewType === ViewType.ByDecade) {
        return subsonicApi.getDecades();
    } else {
        return getGenres();
    }
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
        'x-nd-authorization': `Bearer ${token}`,
    };
    const response = await fetch(`${host}/api/${path}`, init);
    if (!response.ok) {
        throw response;
    }
    return response;
}

function getPlayableUrlFromSrc(src: string): string {
    return subsonicApi.getPlayableUrlFromSrc(src, navidromeSettings);
}

const navidromeApi = {
    get,
    getFilters,
    getPage,
    getPlayableUrlFromSrc,
};

export default navidromeApi;
