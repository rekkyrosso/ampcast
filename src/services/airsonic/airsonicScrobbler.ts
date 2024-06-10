import subsonicScrobble from 'services/subsonic/factory/subsonicScrobble';
import airsonic from './airsonic';

subsonicScrobble(airsonic, airsonic.api);
