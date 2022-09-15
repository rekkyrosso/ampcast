import MediaService from 'types/MediaService';
import apple from 'services/apple';
import jellyfin from 'services/jellyfin';
import lastfm from 'services/lastfm';
import listenbrainz from 'services/listenbrainz';
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
    listenbrainz,
];

export default mediaServices;
