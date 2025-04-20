import {
    EMPTY,
    Subject,
    debounceTime,
    distinctUntilChanged,
    filter,
    fromEvent,
    interval,
    map,
    merge,
    mergeMap,
    pairwise,
    skip,
    switchMap,
    takeUntil,
    tap,
} from 'rxjs';
import PlaybackState from 'types/PlaybackState';
import {exists, Logger} from 'utils';
import playback, {
    observePlaybackStart,
    observePlaybackEnd,
    observePlaybackState,
    getPlaybackState,
} from 'services/mediaPlayback/playback';
import {observeIsLoggedIn, isLoggedIn} from './plexAuth';
import {reportStart, reportStop, reportProgress} from './plexReporting';

const logger = new Logger('plexScrobbler');

export function scrobble(): void {
    const stopped$ = new Subject<void>();
    const killed$ = new Subject<void>();
    const isPlexItem = (state: PlaybackState): boolean =>
        state.currentItem?.src.startsWith('plex:') || false;

    fromEvent(window, 'pagehide').subscribe(() => {
        killed$.next();
        if (isLoggedIn()) {
            const currentItem = playback.currentItem;
            if (currentItem?.src.startsWith('plex:')) {
                reportStop(currentItem);
            }
        }
    });

    observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackStart() : EMPTY)),
            filter(isPlexItem),
            mergeMap(({currentItem}) => reportStart(currentItem!)),
            takeUntil(killed$)
        )
        .subscribe(logger);

    observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackState() : EMPTY)),
            pairwise(),
            map(([prevState, nextState]) =>
                isPlexItem(prevState) && !isPlexItem(nextState) ? prevState.currentItem : null
            ),
            filter(exists),
            tap(() => stopped$.next()),
            mergeMap((prevItem) => reportStop(prevItem)),
            takeUntil(killed$)
        )
        .subscribe(logger);

    observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackEnd() : EMPTY)),
            filter(isPlexItem),
            mergeMap(({currentItem}) => reportProgress(currentItem!, 0, 'paused')),
            takeUntil(killed$)
        )
        .subscribe(logger);

    observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackStart() : EMPTY)),
            switchMap((state) =>
                isPlexItem(state)
                    ? merge(
                          observePlaybackState().pipe(
                              distinctUntilChanged((a, b) => a.paused === b.paused),
                              skip(1),
                              takeUntil(observePlaybackEnd())
                          ),
                          interval(10_000).pipe(
                              map(() => getPlaybackState()),
                              takeUntil(stopped$)
                          )
                      )
                    : EMPTY
            ),
            debounceTime(500),
            mergeMap(({currentItem, currentTime, paused}) =>
                reportProgress(currentItem!, currentTime, paused ? 'paused' : 'playing')
            ),
            takeUntil(killed$)
        )
        .subscribe(logger);
}

export default {scrobble};
