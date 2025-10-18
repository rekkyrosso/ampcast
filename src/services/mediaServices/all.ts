import MediaService from 'types/MediaService';
import {exists} from 'utils';
import buildConfig from 'services/buildConfig';
import airsonic from 'services/subsonic/airsonic';
import ampache from 'services/subsonic/ampache';
import apple from 'services/apple';
import emby from 'services/emby';
import gonic from 'services/subsonic/gonic';
import jellyfin from 'services/jellyfin';
import lastfm from 'services/lastfm';
import listenbrainz from 'services/listenbrainz';
import localdb from 'services/localdb';
import mixcloud from 'services/mixcloud';
import navidrome from 'services/navidrome';
import plex from 'services/plex';
import soundcloud from 'services/soundcloud';
import spotify from 'services/spotify';
import subsonic from 'services/subsonic';
// import tidal from 'services/tidal';
import youtube from 'services/youtube';

const allServices: readonly MediaService[] = [
    apple,
    spotify,
    // tidal,
    airsonic,
    ampache,
    emby,
    gonic,
    jellyfin,
    mixcloud,
    navidrome,
    plex,
    soundcloud,
    subsonic,
    youtube,
    lastfm,
    listenbrainz,
];

const enabledServices = buildConfig.enabledServices
    .map((serviceId) => allServices.find((service) => service.id === serviceId))
    .filter(exists);

if (enabledServices.length === 0) {
    // The enabled service list didn't match anything so reset it.
    (buildConfig.enabledServices as []).length = 0;
}

const disabledServices = allServices.filter((service) => !enabledServices.includes(service));
const services = enabledServices.concat(disabledServices);

export default [localdb as MediaService].concat(services);
