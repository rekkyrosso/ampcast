import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    combineLatest,
    debounceTime,
    delay,
    delayWhen,
    distinctUntilChanged,
    filter,
    firstValueFrom,
    fromEvent,
    map,
    mergeMap,
    of,
    race,
    skip,
    skipWhile,
    switchMap,
    take,
    takeUntil,
    tap,
    timer,
    withLatestFrom,
} from 'rxjs';
import MediaPlayback from 'types/MediaPlayback';
import Player from 'types/Player';
import PlaybackType from 'types/PlaybackType';
import PlaylistItem from 'types/PlaylistItem';
import RepeatMode from 'types/RepeatMode';
import {formatTime, isMiniPlayer, Logger} from 'utils';
import {MAX_DURATION} from 'services/constants';
import {createMediaItemFromUrl, dispatchMetadataChanges} from 'services/metadata';
import lookup from 'services/lookup';
import {hasPlayableSrc, getServiceFromSrc} from 'services/mediaServices';
import playlist from 'services/playlist';
import {lockVisualizer, setCurrentVisualizer} from 'services/visualizer';
import mediaPlayer from './mediaPlayer';
import miniPlayer from './miniPlayer';
import miniPlayerRemote from './miniPlayerRemote';
import playback, {observePaused} from './playback';
import playbackSettings, {observePlaybackSettings} from './playbackSettings';
import visualizerPlayer from './visualizerPlayer';
import './scrobbler';

const logger = new Logger('mediaPlayback');
const loadingLocked$ = new BehaviorSubject(!isMiniPlayer);
const killed$ = new Subject<void>();

let _autoplay = false;
let _stopAfterCurrent = false;
let currentNavigation: 'prev' | 'next' = 'next';

export function observeCurrentTime(): Observable<number> {
    return playback.observeCurrentTime();
}

export function observeDuration(): Observable<number> {
    return playback.observeDuration();
}

function observeActivePlayer(): Observable<
    Pick<Player<any>, 'observeEnded' | 'observeError' | 'observePlaying'>
> {
    return miniPlayer.observeActive().pipe(map((active) => (active ? miniPlayer : mediaPlayer)));
}

export function observeEnded(): Observable<void> {
    return observeActivePlayer().pipe(switchMap((player) => player.observeEnded()));
}

export function observeError(): Observable<unknown> {
    return observeActivePlayer().pipe(switchMap((player) => player.observeError()));
}

export function observePlaying(): Observable<void> {
    return observeActivePlayer().pipe(switchMap((player) => player.observePlaying()));
}

function appendTo(parentElement: HTMLElement): void {
    mediaPlayer.appendTo(parentElement);
    visualizerPlayer.appendTo(parentElement);
}

export function eject(): void {
    logger.log('eject');
    if (mediaPlayback.stopAfterCurrent) {
        stop();
    } else {
        // Ejecting will load the next item.
        lockLoading();
    }
    playlist.eject();
}

export function load(item: PlaylistItem | null): void {
    logger.log('load', item?.src);
    if (miniPlayer.active) {
        miniPlayer.load(item);
    } else {
        playback.currentItem = item;
        mediaPlayer.load(item);
        if (mediaPlayback.autoplay) {
            playback.play();
            visualizerPlayer.play();
        }
    }
}

export function loadAndPlay(item: PlaylistItem): void {
    logger.log('loadAndPlay', item?.src);
    if (!isMiniPlayer) {
        if (item.id === playlist.getCurrentItem()?.id) {
            play();
        } else {
            mediaPlayback.autoplay = true;
            mediaPlayback.stopAfterCurrent = false;
            lockLoading();
            playlist.setCurrentItem(item);
        }
    }
}

function loadNext(item: PlaylistItem | null): void {
    if (!mediaPlayback.stopAfterCurrent) {
        if (miniPlayer.active) {
            miniPlayer.loadNext(item);
        } else {
            mediaPlayer.loadNext(item);
        }
    }
}

export function play(): void {
    logger.log('play');
    if (playlist.size > 0) {
        currentNavigation = 'next';
        unlockLoading();
        mediaPlayback.autoplay = true;
        if (miniPlayer.active) {
            miniPlayer.play();
        } else {
            playback.play();
            if (!playback.paused) {
                mediaPlayer.play();
                visualizerPlayer.play();
            }
        }
    }
}

export function pause(): void {
    logger.log('pause');
    mediaPlayback.autoplay = false;
    currentNavigation = 'next';
    unlockLoading();
    if (miniPlayer.active) {
        miniPlayer.pause();
    } else {
        playback.pause();
        mediaPlayer.pause();
        visualizerPlayer.pause();
    }
}

export function seek(time: number): void {
    logger.log('seek', formatTime(time));
    if (miniPlayer.active) {
        miniPlayer.seek(time);
    } else {
        mediaPlayer.seek(time);
    }
}

export function stop(): void {
    logger.log('stop');
    mediaPlayback.autoplay = false;
    mediaPlayback.stopAfterCurrent = false;
    currentNavigation = 'next';
    unlockLoading();
    if (miniPlayer.active) {
        miniPlayer.stop();
    } else {
        playback.stop();
        mediaPlayer.stop();
        visualizerPlayer.stop();
    }
}

function resize(width: number, height: number): void {
    mediaPlayer.resize(width, height);
    visualizerPlayer.resize(width, height);
}

export function prev(): void {
    logger.log('prev');
    if (isMiniPlayer) {
        miniPlayerRemote.prev();
    } else if (!playlist.atStart) {
        mediaPlayback.stopAfterCurrent = false;
        currentNavigation = 'prev';
        lockLoading();
        playlist.prev();
    }
}

export function next(): void {
    logger.log('next');
    if (isMiniPlayer) {
        miniPlayerRemote.next();
    } else if (!playlist.atEnd) {
        mediaPlayback.stopAfterCurrent = false;
        currentNavigation = 'next';
        lockLoading();
        playlist.next();
    }
}

async function skipPrev(): Promise<void> {
    if (miniPlayer.active) {
        miniPlayer.skipPrev();
        await waitForNextTrack();
    } else {
        await mediaPlayer.skipPrev();
    }
}

async function skipNext(): Promise<void> {
    if (miniPlayer.active) {
        miniPlayer.skipNext();
        await waitForNextTrack();
    } else {
        await mediaPlayer.skipNext();
    }
}

async function waitForNextTrack(timeout = 3_000): Promise<void> {
    await firstValueFrom(race(playback.observePlaybackStart(), timer(timeout)));
}

function observePlaylistAtEnd(): Observable<boolean> {
    return combineLatest([playlist.observeCurrentIndex(), playlist.observeSize()]).pipe(
        map(([index, size]) => index === size - 1),
        distinctUntilChanged()
    );
}

function observePlaylistAtStart(): Observable<boolean> {
    return playlist.observeCurrentIndex().pipe(
        map((index) => index === 0),
        distinctUntilChanged()
    );
}

// Prevent loading the media player while skipping tracks.
function lockLoading() {
    miniPlayer.lock();
    if (loadingLocked$.value === false) {
        const {paused, currentTime} = playback;
        if (!paused || currentTime > 0) {
            playback.stop();
            mediaPlayer.stop();
        }
        if (!paused) {
            // We're still playing even if the media player is temporarily stopped
            // while we click through the playlist.
            // So resume the playback session.
            playback.play();
        }
    }
    // Re-trigger locking.
    loadingLocked$.next(true);
}

function unlockLoading(): void {
    miniPlayer.unlock();
    mediaPlayer.autoplay = _autoplay;
    loadingLocked$.next(false);
}

function kill(): void {
    killed$.next();
    if (isMiniPlayer) {
        mediaPlayer.pause();
    } else {
        stop();
    }
}

async function getPlayableItem(item: PlaylistItem | null): Promise<PlaylistItem | null> {
    if (!item) {
        return null;
    }
    try {
        if (!hasPlayableSrc(item)) {
            // Lookup the item if it's not from a playable source (e.g last.fm).
            const foundItem = await lookup(item);
            if (foundItem) {
                item = {...item, ...foundItem};
            } else {
                return item;
            }
        }
        if (item.playbackType === undefined) {
            // Whether to use HLS, Dash, etc.
            const playbackType = await getPlaybackType(item);
            item = {...item, playbackType};
        }
    } catch (err) {
        logger.error(err);
    }
    return item;
}

async function getPlaybackType(item: PlaylistItem): Promise<PlaybackType> {
    let playbackType = item.playbackType;
    try {
        if (playbackType === undefined) {
            const service = getServiceFromSrc(item);
            if (service?.isLoggedIn() === false) {
                // Don't dispatch if we're not logged in.
                return PlaybackType.Direct;
            }
            if (service?.getPlaybackType) {
                playbackType = await service.getPlaybackType(item);
            } else if (/^https?:/.test(item.src)) {
                const lookup = await createMediaItemFromUrl(item.src);
                playbackType = lookup.playbackType;
            }
            dispatchMetadataChanges({
                match: (object) => object.src === item.src,
                values: {playbackType},
            });
        }
    } catch (err) {
        logger.error(err);
    }
    return playbackType ?? PlaybackType.Direct;
}

const mediaPlayback: MediaPlayback = {
    get autoplay(): boolean {
        return _autoplay;
    },
    set autoplay(autoplay: boolean) {
        _autoplay = autoplay;
        mediaPlayer.autoplay = autoplay;
        miniPlayer.autoplay = autoplay;
        visualizerPlayer.autoplay = autoplay;
    },
    get hidden(): boolean {
        return false;
    },
    get muted(): boolean {
        return playbackSettings.muted;
    },
    set muted(muted: boolean) {
        playbackSettings.muted = muted;
    },
    get repeatMode(): RepeatMode {
        return playbackSettings.repeatMode;
    },
    set repeatMode(repeatMode: RepeatMode) {
        playbackSettings.repeatMode = repeatMode;
    },
    get stopAfterCurrent(): boolean {
        return _stopAfterCurrent;
    },
    set stopAfterCurrent(stopAfterCurrent: boolean) {
        _stopAfterCurrent = stopAfterCurrent;
        if (stopAfterCurrent && playbackSettings.repeatMode === RepeatMode.One) {
            playbackSettings.repeatMode = RepeatMode.None;
        }
    },
    get volume(): number {
        return playbackSettings.volume;
    },
    set volume(volume: number) {
        playbackSettings.volume = volume;
    },
    observeCurrentTime,
    observeDuration,
    observeEnded,
    observeError,
    observePlaying,
    appendTo,
    eject,
    load,
    loadAndPlay,
    play,
    pause,
    stop,
    seek,
    resize,
    next,
    prev,
    skipNext,
    skipPrev,
};

export default mediaPlayback;

// Synch playback settings.
observePlaybackSettings()
    .pipe(
        tap(({volume, muted, repeatMode}) => {
            mediaPlayer.volume = volume;
            mediaPlayer.muted = muted;
            mediaPlayer.loop = repeatMode === RepeatMode.One;
        })
    )
    .subscribe(logger);

// Connect miniPlayer.
if (isMiniPlayer) {
    miniPlayerRemote.connect(mediaPlayback, lockLoading, unlockLoading);
} else {
    miniPlayer.connect(mediaPlayback, playback, lockVisualizer, setCurrentVisualizer);
}

// Synch playback state with media player events.
mediaPlayer.observePlaying().subscribe(() => playback.playing());
mediaPlayer.observeDuration().subscribe((duration) => (playback.duration = duration));
mediaPlayer.observeCurrentTime().subscribe((currentTime) => (playback.currentTime = currentTime));
mediaPlayer.observeEnded().subscribe(() => playback.ended());
playlist
    .observeCurrentItem()
    .pipe(
        switchMap((item) => (item ? mediaPlayer.observeNowPlaying(item) : of(null))),
        tap((item) => (playback.currentItem = item))
    )
    .subscribe(logger);

if (!isMiniPlayer) {
    // Stop/next after playback ended.
    observeEnded()
        .pipe(
            filter(() => !mediaPlayer.loop),
            takeUntil(killed$)
        )
        .subscribe(() => {
            if (playlist.atEnd) {
                if (
                    !mediaPlayback.stopAfterCurrent &&
                    mediaPlayback.repeatMode === RepeatMode.All
                ) {
                    if (playlist.atStart) {
                        play();
                    } else {
                        const [start] = playlist.getItems();
                        playlist.setCurrentItem(start);
                    }
                } else {
                    stop();
                }
            } else {
                if (mediaPlayback.stopAfterCurrent) {
                    stop();
                } else {
                    playlist.next();
                }
            }
        });

    // `stopAfterCurrent`.
    playback
        .observePlaybackEnd()
        .pipe(takeUntil(killed$))
        .subscribe(() => {
            if (mediaPlayback.stopAfterCurrent) {
                stop();
            }
        });

    // Continue playing if we get a playback error (move to the next track)
    playlist
        .observeCurrentItem()
        .pipe(
            distinctUntilChanged((a, b) => a?.id === b?.id),
            switchMap((item) =>
                item
                    ? observeError().pipe(
                          debounceTime(750), // delay before moving on
                          withLatestFrom(
                              playback.observePaused(),
                              observePlaylistAtStart(),
                              observePlaylistAtEnd()
                          )
                      )
                    : EMPTY
            ),
            takeUntil(killed$)
        )
        .subscribe(([, paused, atStart, atEnd]) => {
            if (!paused) {
                if (currentNavigation === 'prev') {
                    if (atStart) {
                        stop();
                    } else {
                        playlist.prev();
                    }
                } else {
                    if (atEnd) {
                        stop();
                    } else {
                        playlist.next();
                    }
                }
            }
        });

    // Stop if the playlist is cleared.
    playlist
        .observeSize()
        .pipe(
            map((size) => size === 0),
            distinctUntilChanged(),
            skipWhile((isEmpty) => isEmpty),
            filter((isEmpty) => isEmpty)
        )
        .subscribe(stop);

    // Use `duration` from media playback (it's more reliable).
    playlist
        .observeCurrentItem()
        .pipe(
            map((item) => (item?.duration === MAX_DURATION ? null : item)),
            switchMap((item) =>
                item
                    ? playback.observePlaybackState().pipe(
                          filter(({currentItem}) => currentItem?.id === item.id),
                          map(({duration}) => duration),
                          distinctUntilChanged(),
                          filter((duration) => !!duration && duration !== item.duration),
                          take(2), // If the duration keeps changing then maybe it's not so reliable.
                          tap((duration) =>
                              dispatchMetadataChanges({
                                  match: (object) => object.src === item.src,
                                  values: {duration},
                              })
                          )
                      )
                    : EMPTY
            )
        )
        .subscribe(logger);

    observePlaying().subscribe(() => (currentNavigation = 'next'));

    // Unlock loading after 300ms. Nothing wil be loaded until then.
    // This avoids spamming media services with play/lookup requests that will soon be skipped over.
    // e.g. clicking the prev/next buttons quickly.
    timer(1000) // delay initial loading
        .pipe(
            switchMap(() =>
                loadingLocked$.pipe(
                    debounceTime(300),
                    filter((locked) => locked),
                    tap(() => unlockLoading())
                )
            )
        )
        .subscribe(logger);

    // Load current item and pre-load next item.
    loadingLocked$
        .pipe(
            distinctUntilChanged(),
            switchMap((locked) => (locked ? EMPTY : playlist.observeCurrentItem())),
            distinctUntilChanged((a, b) => a?.id === b?.id),
            mergeMap((item) => getPlayableItem(item)),
            switchMap((item) =>
                item
                    ? of(item).pipe(
                          tap(load),
                          delayWhen(() => observePlaying()),
                          take(1),
                          delay(3_000),
                          switchMap(() => playlist.observeNextItem()),
                          distinctUntilChanged((a, b) => a?.id === b?.id),
                          debounceTime(300),
                          mergeMap((item) => getPlayableItem(item)),
                          tap(loadNext)
                      )
                    : EMPTY
            )
        )
        .subscribe(logger);

    // Read ahead.
    observePaused()
        .pipe(
            switchMap((paused) => (paused ? playlist.observeNextItem() : EMPTY)),
            distinctUntilChanged((a, b) => a?.id === b?.id),
            debounceTime(3_000),
            mergeMap((item) => getPlayableItem(item))
        )
        .subscribe(logger);

    // Reset repeat mode after change of track.
    playlist
        .observeCurrentItem()
        .pipe(
            skipWhile((item) => !item),
            skip(1),
            distinctUntilChanged((a, b) => a?.id === b?.id),
            filter(() => mediaPlayback.repeatMode === RepeatMode.One),
            tap(() => (mediaPlayback.repeatMode = RepeatMode.None))
        )
        .subscribe(logger);
}

fromEvent(window, 'pagehide').subscribe(kill);

// logging
observePlaying().subscribe(() => logger.log('playing'));
playback
    .observePlaybackStart()
    .pipe(map((state) => state.currentItem?.src))
    .subscribe(logger.rx('playbackStart'));
observeDuration().pipe(map(formatTime), distinctUntilChanged()).subscribe(logger.rx('duration'));
observeCurrentTime()
    .pipe(
        filter((time) => Math.floor(time) % 30 === 0),
        map(formatTime),
        distinctUntilChanged()
    )
    .subscribe(logger.rx('currentTime'));
playback
    .observePlaybackEnd()
    .pipe(map((state) => state.currentItem?.src))
    .subscribe(logger.rx('playbackEnd'));
observeEnded().subscribe(() => logger.log('ended'));
observeError().subscribe(logger.error);
