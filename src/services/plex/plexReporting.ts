import {EMPTY} from 'rxjs';
import {distinctUntilChanged, filter, mergeMap, skip, switchMap, takeUntil} from 'rxjs/operators';
import PlaybackState from 'types/PlaybackState';
import {
    observePlaybackStart,
    observePlaybackEnd,
    observePlaybackProgress,
    observePlaybackState,
} from 'services/mediaPlayback';
import Logger from 'utils/Logger';
import {observeIsLoggedIn} from './plexAuth';
import {reportStart, reportStop, reportProgress} from './plexPlayback';

console.log('module::plexReporting');

const logger = new Logger('plexReporting');

const isPlexItem = (state: PlaybackState): boolean =>
    state.currentItem?.src.startsWith('plex:') || false;

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
