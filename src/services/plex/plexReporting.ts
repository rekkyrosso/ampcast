import {EMPTY} from 'rxjs';
import {distinctUntilChanged, filter, skip, switchMap, takeUntil, tap} from 'rxjs/operators';
import PlaybackState from 'types/PlaybackState';
import {
    observePlaybackStart,
    observePlaybackEnd,
    observePlaybackProgress,
    observePlaybackState,
} from 'services/mediaPlayback';
import Logger from 'utils/Logger';
import {reportStart, reportStop, reportProgress} from './plexPlayback';

console.log('module::plexReporting');

const logger = new Logger('plexReporting');

const isPlexItem = (state: PlaybackState): boolean =>
    state.currentItem?.src.startsWith('plex:') || false;

observePlaybackStart()
    .pipe(
        filter(isPlexItem),
        tap(({currentItem}) => reportStart(currentItem!))
    )
    .subscribe(logger);

observePlaybackEnd()
    .pipe(
        filter(isPlexItem),
        tap(({currentItem}) => reportStop(currentItem!))
    )
    .subscribe(logger);

observePlaybackProgress(10_000)
    .pipe(
        filter(isPlexItem),
        tap(({currentItem, currentTime, paused}) =>
            reportProgress(currentItem!, currentTime, paused ? 'paused' : 'playing')
        )
    )
    .subscribe(logger);

observePlaybackStart()
    .pipe(
        switchMap((state) =>
            isPlexItem(state)
                ? observePlaybackState().pipe(
                      distinctUntilChanged((a, b) => a.paused === b.paused),
                      skip(1),
                      takeUntil(observePlaybackEnd())
                  )
                : EMPTY
        ),
        tap(({currentItem, currentTime, paused}) =>
            reportProgress(currentItem!, currentTime, paused ? 'paused' : 'playing')
        )
    )
    .subscribe(logger);
