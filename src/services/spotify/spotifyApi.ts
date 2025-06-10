import SpotifyWebApi from 'spotify-web-api-js';
import {sleep} from 'utils';
import {refreshToken} from './spotifyAuth';

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

const spotifyApi = new SpotifyWebApi();

export default spotifyApi;

export async function spotifyApiCallWithRetry<T>(fetch: () => Promise<T>): Promise<T> {
    try {
        return await fetch();
    } catch (err: any) {
        switch (err.status) {
            case 401:
                await refreshToken();
                return fetch();

            case 429: {
                const retryAfter = Number(err.headers?.get('Retry-After'));
                if (retryAfter && retryAfter <= 5) {
                    await sleep(retryAfter * 1000);
                    return fetch();
                } else {
                    throw err;
                }
            }

            default:
                throw err;
        }
    }
}
