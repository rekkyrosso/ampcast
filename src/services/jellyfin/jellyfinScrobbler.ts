import embyScrobble from 'services/emby/embyScrobble';
import jellyfinSettings from './jellyfinSettings';
import jellyfin from './jellyfin';

embyScrobble(jellyfin, jellyfinSettings);
