import 'services/jellyfin/jellyfinScrobbler';
import 'services/lastfm/lastfmScrobbler';
import 'services/listenbrainz/listenbrainzScrobbler';
import 'services/plex/plexScrobbler';
import {mergeMap} from 'rxjs/operators';
import {addListen} from 'services/localdb/listens';
import {Logger} from 'utils';
import {observePlaybackEnd} from './playback';

const logger = new Logger('mediaPlayback/scrobbler');

observePlaybackEnd()
    .pipe(mergeMap((state) => addListen(state)))
    .subscribe(logger);
