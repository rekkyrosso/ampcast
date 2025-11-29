import {browser} from 'utils';
import ibroadcastSettings from './ibroadcastSettings';

const apiHost = 'https://api.ibroadcast.com';
const libraryHost = 'https://library.ibroadcast.com';

const userAgent = `${__app_name__} ${__app_version__}`;

const defaultParams = {
    client: __app_name__,
    version: __app_version__,
    device_name: browser.isElectron ? browser.os : 'Web',
    user_agent: userAgent,
};

async function ibroadcastFetch<T extends iBroadcast.Response>(
    host: string,
    params: Record<string, any>
): Promise<T> {
    const token = ibroadcastSettings.token?.access_token;
    if (!token) {
        throw Error('No access token');
    }
    const requestInit = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': userAgent,
        },
        body: JSON.stringify({...defaultParams, ...params}),
    };
    const url = location.protocol === 'http:' ? `/proxy?url=${encodeURIComponent(host)}` : host;
    const response = await fetch(url, requestInit);
    if (!response.ok) {
        throw response;
    }
    const data = await response.json();
    if (data.result) {
        return data;
    } else {
        throw Error(data.message || 'Request error');
    }
}

async function addToPlaylist(playlist: number, tracks: readonly number[]): Promise<void> {
    await ibroadcastFetch(apiHost, {mode: 'appendplaylist', playlist, tracks});
}

async function createPlaylist(
    name: string,
    description: string,
    make_public: boolean,
    tracks: readonly number[]
): Promise<iBroadcast.CreatePlaylistResponse> {
    return ibroadcastFetch<iBroadcast.CreatePlaylistResponse>(apiHost, {
        mode: 'createplaylist',
        name,
        description,
        make_public,
        tracks,
    });
}

async function deletePlaylist(playlist: number): Promise<void> {
    await ibroadcastFetch(apiHost, {mode: 'deleteplaylist', playlist});
}

async function editPlaylist(playlist: number, name: string, description: string): Promise<void> {
    await ibroadcastFetch(apiHost, {mode: 'updateplaylist', playlist, name, description});
}

async function makePlaylistPublic(playlist_id: number): Promise<string> {
    const {public_id} = await ibroadcastFetch<iBroadcast.MakePlaylistPublicResponse>(apiHost, {
        mode: 'makeplaylistpublic',
        playlist_id,
    });
    return public_id;
}

async function revokePlaylistPublic(playlist_id: number): Promise<void> {
    await ibroadcastFetch(apiHost, {
        mode: 'revokeplaylistpublic',
        playlist_id,
    });
}

async function getLibrary(): Promise<iBroadcast.LibraryResponse> {
    return ibroadcastFetch<iBroadcast.LibraryResponse>(libraryHost, {mode: 'library'});
}

async function getStatus(): Promise<iBroadcast.StatusResponse> {
    return ibroadcastFetch<iBroadcast.StatusResponse>(apiHost, {mode: 'status'});
}

async function rateAlbum(album_id: string, rating: number): Promise<void> {
    await ibroadcastFetch(apiHost, {mode: 'ratealbum', album_id, rating});
}

async function rateArtist(artist_id: string, rating: number): Promise<void> {
    await ibroadcastFetch(apiHost, {mode: 'rateartist', artist_id, rating});
}

async function rateTrack(track_id: string, rating: number): Promise<void> {
    await ibroadcastFetch(apiHost, {mode: 'ratetrack', track_id, rating});
}

const ibroadcastApi = {
    addToPlaylist,
    createPlaylist,
    deletePlaylist,
    editPlaylist,
    getLibrary,
    getStatus,
    makePlaylistPublic,
    rateAlbum,
    rateArtist,
    rateTrack,
    revokePlaylistPublic,
};

export default ibroadcastApi;
