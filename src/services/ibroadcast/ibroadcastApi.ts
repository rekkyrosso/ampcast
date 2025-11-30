import {browser} from 'utils';
import ibroadcastSettings from './ibroadcastSettings';

const apiHost = '//api.ibroadcast.com';
const libraryHost = '//library.ibroadcast.com';

const userAgent = `${__app_name__} ${__app_version__}`;

const requiredParams = {
    client: __app_name__,
    version: __app_version__,
    device_name: browser.isElectron ? browser.os : 'Web',
    user_agent: userAgent,
};

async function post<T extends iBroadcast.Response>(
    mode: string,
    params?: Record<string, any>,
    host = apiHost
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
        body: JSON.stringify({...params, ...requiredParams, mode}),
    };
    const response = await fetch(`${location.protocol}${host}`, requestInit);
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

async function addToPlaylist(
    playlist: number,
    tracks: readonly number[]
): Promise<iBroadcast.AddToPlaylistResponse> {
    return post('appendplaylist', {playlist, tracks});
}

async function createPlaylist(
    name: string,
    description: string,
    make_public: boolean,
    tracks: readonly number[]
): Promise<iBroadcast.CreatePlaylistResponse> {
    return post('createplaylist', {name, description, make_public, tracks});
}

async function deletePlaylist(playlist: number): Promise<void> {
    await post('deleteplaylist', {playlist});
}

async function editPlaylist(playlist: number, name: string, description: string): Promise<void> {
    await post('updateplaylist', {playlist, name, description});
}

async function makePlaylistPublic(
    playlist_id: number
): Promise<iBroadcast.MakePlaylistPublicResponse> {
    return post('makeplaylistpublic', {playlist_id});
}

async function revokePlaylistPublic(playlist_id: number): Promise<void> {
    await post('revokeplaylistpublic', {playlist_id});
}

async function getLibrary(): Promise<iBroadcast.LibraryResponse> {
    return post('library', undefined, libraryHost);
}

async function getStatus(): Promise<iBroadcast.StatusResponse> {
    return post('status');
}

async function rateAlbum(album_id: number, rating: number): Promise<void> {
    await post('ratealbum', {album_id, rating});
}

async function rateArtist(artist_id: number, rating: number): Promise<void> {
    await post('rateartist', {artist_id, rating});
}

async function rateTrack(track_id: number, rating: number): Promise<void> {
    await post('ratetrack', {track_id, rating});
}

async function updatePlaylistTracks(
    playlist: number,
    tracks: readonly number[]
): Promise<iBroadcast.UpdatePlaylistResponse> {
    return post('updateplaylist', {playlist, tracks});
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
    updatePlaylistTracks,
};

export default ibroadcastApi;
