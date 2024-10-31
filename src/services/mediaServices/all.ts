import MediaService from 'types/MediaService';
import airsonic from 'services/airsonic';
import ampache from 'services/ampache';
import apple from 'services/apple';
import emby from 'services/emby';
import gonic from 'services/gonic';
import jellyfin from 'services/jellyfin';
import lastfm from 'services/lastfm';
import listenbrainz from 'services/listenbrainz';
import navidrome from 'services/navidrome';
import plex from 'services/plex';
import plexTidal from 'services/plex/tidal-disabled';
import spotify from 'services/spotify';
import subsonic from 'services/subsonic';
import tidal from 'services/tidal';
import youtube from 'services/youtube';

const services: readonly MediaService[] = [
    apple,
    spotify,
    tidal,
    airsonic,
    ampache,
    emby,
    gonic,
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
