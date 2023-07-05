import embyScrobble from 'services/emby/embyScrobble';
import jellyfinSettings from './jellyfinSettings';
import jellyfin from './jellyfin';

console.log('module::jellyfinScrobbler');

embyScrobble(jellyfin, jellyfinSettings);
