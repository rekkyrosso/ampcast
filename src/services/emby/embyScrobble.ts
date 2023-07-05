import {EMPTY, distinctUntilChanged, filter, mergeMap, skip, switchMap, takeUntil} from 'rxjs';
import MediaService from 'types/MediaService';
import PlaybackState from 'types/PlaybackState';
import {
    observePlaybackStart,
    observePlaybackEnd,
    observePlaybackProgress,
    observePlaybackState,
} from 'services/mediaPlayback/playback';
import {Logger} from 'utils';
import {reportStart, reportStop, reportProgress} from './embyReporting';
import {EmbySettings} from './embySettings';

export default function embyScrobble(service: MediaService, settings: EmbySettings): void {
    const logger = new Logger(`${service.id}Scrobbler`);

    const isValidItem = (state: PlaybackState): boolean =>
        !!state.currentItem?.src.startsWith(`${service.id}:`);

    service
        .observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackStart() : EMPTY)),
            filter(isValidItem),
            mergeMap(({currentItem}) => reportStart(currentItem!, settings))
        )
        .subscribe(logger);

    service
        .observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackEnd() : EMPTY)),
            filter(isValidItem),
            mergeMap(({currentItem, currentTime}) =>
                reportStop(currentItem!, currentTime, settings)
            )
        )
        .subscribe(logger);

    service
        .observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackProgress(10_000) : EMPTY)),
            filter(isValidItem),
            filter(({currentTime}) => currentTime > 0),
            mergeMap(({currentItem, currentTime, paused}) =>
                reportProgress(currentItem!, currentTime, paused, 'timeupdate', settings)
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
            mergeMap(({currentItem, currentTime, paused}) =>
                reportProgress(
                    currentItem!,
                    currentTime,
                    paused,
                    paused ? 'pause' : 'unpause',
                    settings
                )
            )
        )
        .subscribe(logger);
}
