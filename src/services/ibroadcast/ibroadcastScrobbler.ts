import {EMPTY, debounceTime, filter, mergeMap, switchMap} from 'rxjs';
import PlaybackState from 'types/PlaybackState';
import {Logger} from 'utils';
import {isListenedTo} from 'services/localdb/listens';
import {observePlaybackEnd, observePlaybackStart} from 'services/mediaPlayback/playback';
import {getIdFromSrc} from './ibroadcastUtils';
import {observeIsLoggedIn} from './ibroadcastAuth';
import ibroadcastLibrary from './ibroadcastLibrary';

const logger = new Logger('ibroadcastScrobbler');

export function scrobble(): void {
    const isValidItem = (state: PlaybackState): boolean =>
        state.currentItem?.src.startsWith('ibroadcast:') || false;

    observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackStart() : EMPTY)),
            filter(isValidItem),
            debounceTime(10_000),
            mergeMap(({currentItem, startedAt}) =>
                ibroadcastLibrary.scrobble(getIdFromSrc(currentItem!), 'play', startedAt)
            )
        )
        .subscribe(logger);

    observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackEnd() : EMPTY)),
            filter(isValidItem),
            filter(({duration, startedAt, endedAt}) => !isListenedTo(duration, startedAt, endedAt)),
            mergeMap(({currentItem, endedAt}) =>
                ibroadcastLibrary.scrobble(getIdFromSrc(currentItem!), 'skip', endedAt)
            )
        )
        .subscribe(logger);
}

export default {scrobble};
