import subsonicScrobble from 'services/subsonic/subsonicScrobble';
import navidromeSettings from './navidromeSettings';
import navidrome from './navidrome';

console.log('module::navidromeScrobbler');

subsonicScrobble(navidrome, navidromeSettings);
