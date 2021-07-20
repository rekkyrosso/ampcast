import MediaService from 'types/MediaService';
import apple from 'services/apple';
import jellyfin from 'services/jellyfin';
import lastfm from 'services/lastfm';
import plex from 'services/plex';
import spotify from 'services/spotify';
import youtube from 'services/youtube';

const mediaServices: readonly MediaService[] = [
    apple,
    spotify,
    youtube,
    plex,
    jellyfin,
    lastfm,
];

export default mediaServices;
