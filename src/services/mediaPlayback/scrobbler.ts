import 'services/emby/embyScrobbler';
import 'services/jellyfin/jellyfinScrobbler';
import 'services/lastfm/lastfmScrobbler';
import 'services/listenbrainz/listenbrainzScrobbler';
import 'services/navidrome/navidromeScrobbler';
import 'services/plex/plexScrobbler';
import 'services/subsonic/subsonicScrobbler';
import {mergeMap} from 'rxjs';
import {addListen} from 'services/localdb/listens';
import {Logger} from 'utils';
import {observePlaybackEnd} from './playback';

const logger = new Logger('mediaPlayback/scrobbler');

observePlaybackEnd()
    .pipe(mergeMap((state) => addListen(state)))
    .subscribe(logger);
