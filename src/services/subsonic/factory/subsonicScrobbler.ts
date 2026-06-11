import type {Observable} from 'rxjs';
import {
    EMPTY,
    distinctUntilChanged,
    filter,
    mergeMap,
    skip,
    switchMap,
    takeUntil,
    throttleTime,
} from 'rxjs';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import PlaybackState from 'types/PlaybackState';
import {Logger} from 'utils';
import {isListenedTo} from 'services/localdb/listens';
import {
    observePlaybackStart,
    observePlaybackEnd,
    observePlaybackState,
} from 'services/mediaPlayback/playback';
import SubsonicApi from './SubsonicApi';

export function scrobble(service: MediaService, api: SubsonicApi): void {
    const logger = new Logger(`${service.id}Scrobbler`);

    const isValidItem = ({currentItem}: PlaybackState): boolean =>
        !!currentItem?.src.startsWith(`${service.id}:`) && !currentItem.linearType;

    const reportStart = async (item: MediaItem): Promise<void> => {
        try {
            const [, , id] = item.src.split(':');
            if (api.openSubsonic?.playbackReport) {
                // Need to concat these.
                await api.reportPlayback({
                    state: 'starting',
                    mediaId: id,
                    mediaType: 'song',
                    positionMs: 0,
                });
                await api.reportPlayback({
                    state: 'playing',
                    mediaId: id,
                    mediaType: 'song',
                    positionMs: 0,
                });
            } else {
                await api.scrobble({id, submission: false});
            }
        } catch (err) {
            logger.error(err);
        }
    };

    const reportStop = async (
        item: MediaItem,
        startedAt: number,
        currentTime: number
    ): Promise<void> => {
        try {
            const [, , id] = item.src.split(':');
            if (api.openSubsonic?.playbackReport) {
                await api.reportPlayback({
                    state: 'stopped',
                    mediaId: id,
                    mediaType: 'song',
                    positionMs: Math.floor(currentTime * 1000),
                });
            } else if (isListenedTo(item.duration, startedAt, Date.now())) {
                await api.scrobble({id, time: startedAt, submission: true});
            }
        } catch (err) {
            logger.error(err);
        }
    };

    const reportProgress = async (
        item: MediaItem,
        currentTime: number,
        paused: boolean
    ): Promise<void> => {
        try {
            if (api.openSubsonic?.playbackReport) {
                const [, , id] = item.src.split(':');
                await api.reportPlayback({
                    state: paused ? 'paused' : 'playing',
                    mediaId: id,
                    mediaType: 'song',
                    positionMs: Math.floor(currentTime * 1000),
                });
            }
        } catch (err) {
            logger.error(err);
        }
    };

    service
        .observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackStart() : EMPTY)),
            filter(isValidItem),
            mergeMap(({currentItem}) => reportStart(currentItem!))
        )
        .subscribe(logger);

    service
        .observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackEnd() : EMPTY)),
            filter(isValidItem),
            mergeMap(({currentItem, currentTime, startedAt}) =>
                reportStop(currentItem!, startedAt, currentTime)
            )
        )
        .subscribe(logger);

    service
        .observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) =>
                isLoggedIn && api.openSubsonic?.playbackReport
                    ? observePlaybackProgress(60_000)
                    : EMPTY
            ),
            filter(isValidItem),
            mergeMap(({currentItem, currentTime, paused}) =>
                reportProgress(currentItem!, currentTime, paused)
            )
        )
        .subscribe(logger);

    service
        .observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) =>
                isLoggedIn && api.openSubsonic?.playbackReport ? observePlaybackStart() : EMPTY
            ),
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
                reportProgress(currentItem!, currentTime, paused)
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
