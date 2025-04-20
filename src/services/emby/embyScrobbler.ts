import {
    EMPTY,
    Observable,
    distinctUntilChanged,
    filter,
    mergeMap,
    skip,
    switchMap,
    takeUntil,
    throttleTime,
} from 'rxjs';
import MediaService from 'types/MediaService';
import PlaybackState from 'types/PlaybackState';
import {
    observePlaybackStart,
    observePlaybackEnd,
    observePlaybackState,
} from 'services/mediaPlayback/playback';
import {Logger} from 'utils';
import {reportStart, reportStop, reportProgress} from './embyReporting';
import {EmbySettings} from './embySettings';

export function scrobble(service: MediaService, settings: EmbySettings): void {
    const logger = new Logger(`${service.id}Scrobbler`);

    const isValidItem = (state: PlaybackState): boolean =>
        !!state.currentItem?.src.startsWith(`${service.id}:`);

    service
        .observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackStart() : EMPTY)),
            filter(isValidItem),
            mergeMap(({currentItem, playbackId}) => reportStart(currentItem!, playbackId, settings))
        )
        .subscribe(logger);

    service
        .observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackEnd() : EMPTY)),
            filter(isValidItem),
            mergeMap(({currentItem, currentTime, playbackId}) =>
                reportStop(currentItem!, currentTime, playbackId, settings)
            )
        )
        .subscribe(logger);

    service
        .observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackProgress(10_000) : EMPTY)),
            filter(isValidItem),
            mergeMap(({currentItem, currentTime, paused, playbackId}) =>
                reportProgress(
                    currentItem!,
                    currentTime,
                    paused,
                    'timeupdate',
                    playbackId,
                    settings
                )
            )
        )
        .subscribe(logger);

    service
        .observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackStart() : EMPTY)),
            switchMap((state) =>
                isValidItem(state)
                    ? observePlaybackState().pipe(
                          distinctUntilChanged((a, b) => a.paused === b.paused),
                          skip(1),
                          takeUntil(observePlaybackEnd())
                      )
                    : EMPTY
            ),
            mergeMap(({currentItem, currentTime, paused, playbackId}) =>
                reportProgress(
                    currentItem!,
                    currentTime,
                    paused,
                    paused ? 'pause' : 'unpause',
                    playbackId,
                    settings
                )
            )
        )
        .subscribe(logger);

    function observePlaybackProgress(interval: number): Observable<PlaybackState> {
        return observePlaybackStart().pipe(
            switchMap(() =>
                observePlaybackState().pipe(
                    throttleTime(interval, undefined, {leading: false, trailing: true}),
                    takeUntil(observePlaybackEnd())
                )
            )
        );
    }
}

export default {scrobble};
