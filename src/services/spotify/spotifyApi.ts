import {chunk, sleep} from 'utils';
import {refreshToken} from './spotifyAuth';
import spotifySettings from './spotifySettings';

export type SpotifyArtist = SpotifyApi.ArtistObjectFull;
export type SpotifyAlbum = SpotifyApi.AlbumObjectFull;
export type SpotifyPlaylist = SpotifyApi.PlaylistObjectFull & {
    isChart?: boolean;
};
export type SpotifyTrack = SpotifyApi.TrackObjectSimplified &
    Partial<SpotifyApi.TrackObjectFull> & {
        played_at?: string; // ISO string
    };
export type SpotifyEpisode = SpotifyApi.EpisodeObjectFull & {
    played_at?: string; // ISO string
}; // TODO: get rid of this somehow
export type SpotifyItem =
    | SpotifyArtist
    | SpotifyAlbum
    | SpotifyTrack
    | SpotifyEpisode
    | SpotifyPlaylist;

const libraryItemsChunkSize = 40;
const playlistItemsChunkSize = 100;

async function addPlaylistItems(
    playlistId: string,
    uris: readonly string[],
    position?: number
): Promise<void> {
    const chunks = chunk(uris, playlistItemsChunkSize);
    if (typeof position === 'number') {
        chunks.reverse();
    }
    for (const uris of chunks) {
        await post(`/playlists/${playlistId}/items`, {uris, position});
    }
}

async function addToLibrary(uris: readonly string[]): Promise<void> {
    await Promise.all(
        chunk(uris, libraryItemsChunkSize).map((uris) =>
            spotifyApiCall('/me/library', {uris}, {method: 'PUT'})
        )
    );
}

async function changePlaylistDetails(
    playlistId: string,
    details: {
        name?: string;
        description?: string;
        public?: boolean;
    }
): Promise<SpotifyApi.PlaylistSnapshotResponse> {
    return post(`/playlists/${playlistId}`, details);
}

async function clearPlaylist(id: string): Promise<void> {
    await updatePlaylistItems(id, []);
}

async function createPlaylist(
    name: string,
    description = '',
    isPublic = true
): Promise<SpotifyApi.CreatePlaylistResponse> {
    return post('/me/playlists', {name, description, public: isPublic});
}

async function getAlbum(id: string): Promise<SpotifyApi.SingleAlbumResponse> {
    const market = spotifySettings.market;
    return get(`/albums/${id}`, {market});
}

async function getAlbumTracks(
    id: string,
    offset = 0,
    limit = libraryItemsChunkSize
): Promise<SpotifyApi.AlbumTracksResponse> {
    const market = spotifySettings.market;
    return get(`/albums/${id}/tracks`, {offset, limit, market});
}

async function getArtist(id: string): Promise<SpotifyApi.SingleArtistResponse> {
    return get(`/artists/${id}`);
}

async function getArtistAlbums(
    id: string,
    offset = 0,
    limit = libraryItemsChunkSize,
    include_groups = ''
): Promise<SpotifyApi.ArtistsAlbumsResponse> {
    const market = spotifySettings.market;
    return get(`/artists/${id}/albums`, {offset, limit, include_groups, market});
}

async function getArtistTopTracks(id: string): Promise<SpotifyApi.ArtistsTopTracksResponse> {
    const market = spotifySettings.market;
    return get(`/artists/${id}/top-tracks`, {market});
}

async function getAudioAnalysisForTrack(id: string): Promise<any> {
    return get(`/audio-analysis/${id}`);
}

async function getCategories(
    offset = 0,
    limit = libraryItemsChunkSize,
    locale = navigator.language.replace('-', '_')
): Promise<SpotifyApi.MultipleCategoriesResponse> {
    return get('/browse/categories', {offset, limit, locale});
}

async function getCategoryPlaylists(
    categoryId: string,
    offset = 0,
    limit = libraryItemsChunkSize
): Promise<SpotifyApi.CategoryPlaylistsResponse> {
    return get(`/browse/categories/${categoryId}/playlists`, {offset, limit});
}

async function getFeaturedPlaylists(
    offset = 0,
    limit = libraryItemsChunkSize,
    locale = navigator.language.replace('-', '_')
): Promise<SpotifyApi.ListOfFeaturedPlaylistsResponse> {
    return get('/browse/featured-playlists', {offset, limit, locale});
}

async function getFollowedArtists(
    after = '',
    limit = 50
): Promise<SpotifyApi.UsersFollowedArtistsResponse> {
    return get('/me/following', {type: 'artist', after, limit});
}

async function getLibraryContains(uris: readonly string[]): Promise<readonly boolean[]> {
    const values = await Promise.all(
        chunk(uris, libraryItemsChunkSize).map((uris) =>
            get<readonly boolean[]>('/me/library/contains', {uris})
        )
    );
    return values.flat();
}

async function getMe(): Promise<SpotifyApi.CurrentUsersProfileResponse> {
    return get('/me');
}

async function getMyAlbums(offset = 0, limit = 50): Promise<SpotifyApi.UsersSavedAlbumsResponse> {
    const market = spotifySettings.market;
    return get('/me/albums', {offset, limit, market});
}

async function getMyPlaylists(
    offset = 0,
    limit = 50
): Promise<SpotifyApi.ListOfCurrentUsersPlaylistsResponse> {
    return get('/me/playlists', {offset, limit});
}

async function getMyTracks(offset = 0, limit = 50): Promise<SpotifyApi.UsersSavedTracksResponse> {
    const market = spotifySettings.market;
    return get('/me/tracks', {offset, limit, market});
}

async function getNewReleases(
    offset = 0,
    limit = libraryItemsChunkSize
): Promise<SpotifyApi.ListOfNewReleasesResponse> {
    return get('/browse/new-releases', {offset, limit});
}

async function getPlaylist(id: string, fields = ''): Promise<SpotifyApi.SinglePlaylistResponse> {
    const market = spotifySettings.market;
    return get(`/playlists/${id}`, {fields, market});
}

async function getPlaylistItems(
    playlistId: string,
    offset = 0,
    limit = libraryItemsChunkSize
): Promise<SpotifyApi.PlaylistItemResponse> {
    const market = spotifySettings.market;
    return get(`/playlists/${playlistId}/items`, {offset, limit, market});
}

async function getRecentlyPlayedTracks(
    limit = libraryItemsChunkSize,
    options?: {after: number} | {before: number}
): Promise<SpotifyApi.UsersRecentlyPlayedTracksResponse> {
    return get('/me/player/recently-played', {limit, ...options});
}

async function getTrack(id: string): Promise<SpotifyApi.SingleTrackResponse> {
    const market = spotifySettings.market;
    return get(`/tracks/${id}`, {market});
}

async function removeFromLibrary(uris: readonly string[]): Promise<void> {
    await Promise.all(
        chunk(uris, libraryItemsChunkSize).map((uris) =>
            spotifyApiCall('/me/library', {uris}, {method: 'DELETE'})
        )
    );
}

async function removePlaylistItems(playlistId: string, uris: readonly string[]): Promise<void> {
    await Promise.all(
        chunk(uris, playlistItemsChunkSize).map((uris) => {
            const items = uris.map((uri) => ({uri}));
            del(`/playlists/${playlistId}/items`, {items});
        })
    );
}

async function search<T extends SpotifyApi.SearchResponse>(
    type: string,
    q: string,
    offset: number,
    limit: number
): Promise<T> {
    const market = spotifySettings.market;
    return get('/search', {q, type, offset, limit, market});
}

async function searchAlbums(
    q: string,
    offset = 0,
    limit = libraryItemsChunkSize
): Promise<SpotifyApi.AlbumSearchResponse> {
    return search('album', q, offset, limit);
}

async function searchArtists(
    q: string,
    offset = 0,
    limit = libraryItemsChunkSize
): Promise<SpotifyApi.ArtistSearchResponse> {
    return search('artist', q, offset, limit);
}

async function searchPlaylists(
    q: string,
    offset = 0,
    limit = libraryItemsChunkSize
): Promise<SpotifyApi.PlaylistSearchResponse> {
    return search('playlist', q, offset, limit);
}

async function searchTracks(
    q: string,
    offset = 0,
    limit = libraryItemsChunkSize
): Promise<SpotifyApi.TrackSearchResponse> {
    return search('track', q, offset, limit);
}

async function updatePlaylistItems(
    playlistId: string,
    uris: readonly string[]
): Promise<SpotifyApi.PlaylistSnapshotResponse> {
    return put(`/playlists/${playlistId}/items`, {uris});
}

async function del<T>(path: string, params: Record<string, any>): Promise<T> {
    const body = JSON.stringify(params);
    return spotifyApiCall(path, undefined, {method: 'DELETE', body});
}

async function get<T>(path: string, params?: Record<string, any>): Promise<T> {
    return spotifyApiCall(path, params, {method: 'GET'});
}

async function post<T>(path: string, params: Record<string, any>): Promise<T> {
    const body = JSON.stringify(params);
    return spotifyApiCall(path, undefined, {method: 'POST', body});
}

async function put<T>(path: string, params: Record<string, any>): Promise<T> {
    const body = JSON.stringify(params);
    return spotifyApiCall(path, undefined, {method: 'PUT', body});
}

async function spotifyApiCall<T>(
    path: string,
    params: Record<string, any> | undefined,
    init: RequestInit
): Promise<T> {
    return spotifyApiCallWithRetry(async () => {
        const {token} = spotifySettings;
        if (!token) {
            throw Error('No access token');
        }
        path = params ? `${path}?${new URLSearchParams(params as any)}` : path;
        if (path.startsWith('/')) {
            path = path.slice(1);
        }
        init.headers = {
            ...init.headers,
            Authorization: `Bearer ${token.access_token}`,
            'Content-Type': 'application/json',
        };
        const response = await fetch(`https://api.spotify.com/v1/${path}`, init);
        if (!response.ok) {
            let err: any = response;
            try {
                if (response.status === 400) {
                    const {error} = await response.json();
                    if (error?.message) {
                        err = Error(error.message);
                    }
                }
            } catch {
                // ignore
            }
            throw err;
        }
        if (response.headers.get('content-type')?.includes('application/json')) {
            return response.json();
        }
    });
}

async function spotifyApiCallWithRetry<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
        const result = await apiCall();
        return result;
    } catch (err: any) {
        switch (err.status) {
            case 401:
                await refreshToken();
                return apiCall();

            case 429: {
                const retryAfter = Number(err.headers?.get('Retry-After'));
                if (retryAfter && retryAfter <= 5) {
                    await sleep(retryAfter * 1000);
                    return apiCall();
                } else {
                    throw err;
                }
            }

            default:
                throw err;
        }
    }
}

const spotifyApi = {
    addPlaylistItems,
    addToLibrary,
    changePlaylistDetails,
    clearPlaylist,
    createPlaylist,
    getAudioAnalysisForTrack,
    getCategories,
    getCategoryPlaylists,
    getFeaturedPlaylists,
    getFollowedArtists,
    getLibraryContains,
    getAlbum,
    getAlbumTracks,
    getArtist,
    getArtistAlbums,
    getArtistTopTracks,
    getMe,
    getMyAlbums,
    getMyPlaylists,
    getMyTracks,
    getNewReleases,
    getPlaylist,
    getPlaylistItems,
    getRecentlyPlayedTracks,
    getTrack,
    removeFromLibrary,
    removePlaylistItems,
    searchAlbums,
    searchArtists,
    searchPlaylists,
    searchTracks,
};

export default spotifyApi;
