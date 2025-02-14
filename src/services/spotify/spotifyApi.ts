import SpotifyWebApi from 'spotify-web-api-js';

const spotifyApi = new SpotifyWebApi();

export default spotifyApi;

export function isSafeOrigin(): boolean {
    // https://developer.spotify.com/documentation/web-api/concepts/redirect_uri
    const {protocol, hostname} = location;
    switch (protocol) {
        case 'https:':
            return true;

        case 'http:':
            return hostname === '[::1]' || hostname === '127.0.0.1';

        default:
            return false;
    }
}
