import {EMPTY} from 'rxjs';
import {distinctUntilChanged, filter, mergeMap, skip, switchMap, takeUntil} from 'rxjs/operators';
import PlaybackState from 'types/PlaybackState';
import {
    observePlaybackStart,
    observePlaybackEnd,
    observePlaybackProgress,
    observePlaybackState,
} from 'services/mediaPlayback/playback';
import {Logger} from 'utils';
import {observeIsLoggedIn} from './jellyfinAuth';
import {reportStart, reportStop, reportProgress} from './jellyfinReporting';

console.log('module::jellyfinScrobbler');

const logger = new Logger('jellyfinScrobbler');

const isJellyfinItem = (state: PlaybackState): boolean =>
    !!state.currentItem?.src.startsWith('jellyfin:');

observeIsLoggedIn()
    .pipe(
        switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackStart() : EMPTY)),
        filter(isJellyfinItem),
        mergeMap(({currentItem}) => reportStart(currentItem!))
    )
    .subscribe(logger);

observeIsLoggedIn()
    .pipe(
        switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackEnd() : EMPTY)),
        filter(isJellyfinItem),
        mergeMap(({currentItem, currentTime}) => reportStop(currentItem!, currentTime))
    )
    .subscribe(logger);

observeIsLoggedIn()
    .pipe(
        switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackProgress(10_000) : EMPTY)),
        filter(isJellyfinItem),
        filter(({currentTime}) => currentTime > 0),
        mergeMap(({currentItem, currentTime, paused}) =>
            reportProgress(currentItem!, currentTime, paused, 'timeupdate')
        )
    )
    .subscribe(logger);

observeIsLoggedIn()
    .pipe(
        switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackStart() : EMPTY)),
        switchMap((state) =>
            isJellyfinItem(state)
                ? observePlaybackState().pipe(
                      distinctUntilChanged((a, b) => a.paused === b.paused),
                      skip(1),
                      takeUntil(observePlaybackEnd())
                  )
                : EMPTY
        ),
        mergeMap(({currentItem, currentTime, paused}) =>
            reportProgress(currentItem!, currentTime, paused, paused ? 'pause' : 'unpause')
        )
    )
    .subscribe(logger);
