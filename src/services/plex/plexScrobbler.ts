import {EMPTY, distinctUntilChanged, filter, mergeMap, skip, switchMap, takeUntil} from 'rxjs';
import PlaybackState from 'types/PlaybackState';
import {
    observePlaybackStart,
    observePlaybackEnd,
    observePlaybackProgress,
    observePlaybackState,
} from 'services/mediaPlayback/playback';
import {Logger} from 'utils';
import {observeIsLoggedIn} from './plexAuth';
import {reportStart, reportStop, reportProgress} from './plexReporting';

const logger = new Logger('plexScrobbler');

export function scrobble(): void {
    const isPlexItem = (state: PlaybackState): boolean =>
        /^(plex(-tidal)?):/.test(state.currentItem?.src as any);

    observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackStart() : EMPTY)),
            filter(isPlexItem),
            mergeMap(({currentItem}) => reportStart(currentItem!))
        )
        .subscribe(logger);

    observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackEnd() : EMPTY)),
            filter(isPlexItem),
            mergeMap(({currentItem}) => reportStop(currentItem!))
        )
        .subscribe(logger);

    observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackProgress(10_000) : EMPTY)),
            filter(isPlexItem),
            filter(({currentTime}) => currentTime > 0),
            mergeMap(({currentItem, currentTime, paused}) =>
                reportProgress(currentItem!, currentTime, paused ? 'paused' : 'playing')
            )
        )
        .subscribe(logger);

    observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackStart() : EMPTY)),
            switchMap((state) =>
                isPlexItem(state)
                    ? observePlaybackState().pipe(
                          distinctUntilChanged((a, b) => a.paused === b.paused),
                          skip(1),
                          takeUntil(observePlaybackEnd())
                      )
                    : EMPTY
            ),
            mergeMap(({currentItem, currentTime, paused}) =>
                reportProgress(currentItem!, currentTime, paused ? 'paused' : 'playing')
            )
        )
        .subscribe(logger);
}

export default {scrobble};
