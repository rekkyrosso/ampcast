import MediaService from 'types/MediaService';
import airsonic from 'services/airsonic';
import apple from 'services/apple';
import emby from 'services/emby';
import jellyfin from 'services/jellyfin';
import lastfm from 'services/lastfm';
import listenbrainz from 'services/listenbrainz';
import navidrome from 'services/navidrome';
import plex from 'services/plex';
import plexTidal from 'services/plex/tidal';
import spotify from 'services/spotify';
import subsonic from 'services/subsonic';
import tidal from 'services/tidal';
import youtube from 'services/youtube';

const services: readonly MediaService[] = [
    apple,
    spotify,
    tidal,
    airsonic,
    emby,
    jellyfin,
    navidrome,
    plex,
    plexTidal,
    subsonic,
    youtube,
    lastfm,
    listenbrainz,
];

export default services;
