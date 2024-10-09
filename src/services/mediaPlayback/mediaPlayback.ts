import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    combineLatest,
    concatMap,
    debounceTime,
    distinctUntilChanged,
    filter,
    fromEvent,
    map,
    of,
    skipWhile,
    switchMap,
    take,
    takeUntil,
    tap,
    withLatestFrom,
} from 'rxjs';
import MediaPlayback from 'types/MediaPlayback';
import Player from 'types/Player';
import PlaybackType from 'types/PlaybackType';
import PlaylistItem from 'types/PlaylistItem';
import {formatTime, isMiniPlayer, Logger} from 'utils';
import {dispatchMediaObjectChanges} from 'services/actions/mediaObjectChanges';
import lookup from 'services/lookup';
import {hasPlayableSrc, getServiceFromSrc} from 'services/mediaServices';
import playlist from 'services/playlist';
import {lockVisualizer, setCurrentVisualizer} from 'services/visualizer';
import mediaPlaybackSettings from './mediaPlaybackSettings';
import mediaPlayer from './mediaPlayer';
import miniPlayer from './miniPlayer';
import miniPlayerRemote from './miniPlayerRemote';
import playback from './playback';
import visualizerPlayer from './visualizerPlayer';
import './scrobbler';

const logger = new Logger('mediaPlayback');
const loadingLocked$ = new BehaviorSubject(!isMiniPlayer);
const killed$ = new Subject<void>();

let _autoplay = false;
let _loop = mediaPlaybackSettings.loop;
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
    logger.log('load', {item});
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
    logger.log('loadAndPlay', {item});
    if (!isMiniPlayer) {
        if (item.id === playback.currentItem?.id) {
            play();
        } else {
            mediaPlayback.autoplay = true;
            mediaPlayback.stopAfterCurrent = false;
            lockLoading();
            playlist.setCurrentItem(item);
        }
    }
}

export function play(): void {
    logger.log('play');
    mediaPlayback.autoplay = true;
    if (miniPlayer.active) {
        miniPlayer.play();
    } else {
        unlockLoading();
        playback.play();
        if (!playback.paused) {
            mediaPlayer.play();
            visualizerPlayer.play();
        }
    }
}

export function pause(): void {
    logger.log('pause');
    mediaPlayback.autoplay = false;
    if (miniPlayer.active) {
        miniPlayer.pause();
    } else {
        unlockLoading();
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
    if (miniPlayer.active) {
        miniPlayer.stop();
    } else {
        unlockLoading();
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
        lockLoading('prev');
        playlist.prev();
    }
}

export function next(): void {
    logger.log('next');
    if (isMiniPlayer) {
        miniPlayerRemote.next();
    } else if (!playlist.atEnd) {
        mediaPlayback.stopAfterCurrent = false;
        lockLoading('next');
        playlist.next();
    }
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

function lockLoading(navigation: 'prev' | 'next' = 'next') {
    currentNavigation = navigation;
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
    currentNavigation = 'next';
    miniPlayer.unlock();
    mediaPlayer.autoplay = _autoplay;
    loadingLocked$.next(false);
}

function kill(): void {
    killed$.next(undefined);
    stop();
}

async function getPlayableItem(item: PlaylistItem): Promise<PlaylistItem> {
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
    return item;
}

async function getPlaybackType(item: PlaylistItem): Promise<PlaybackType> {
    let playbackType = item.playbackType;
    if (playbackType === undefined) {
        const service = getServiceFromSrc(item);
        if (service?.isLoggedIn() === false) {
            // Don't dispatch if we're not logged in.
            return PlaybackType.Direct;
        }
        if (service?.getPlaybackType) {
            playbackType = await service.getPlaybackType(item);
        } else {
            playbackType = PlaybackType.Direct;
        }
        dispatchMediaObjectChanges({
            match: (object) => object.src === item.src,
            values: {playbackType},
        });
    }
    return playbackType;
}

const mediaPlayback: MediaPlayback = {
    stopAfterCurrent: false,
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
    get loop(): boolean {
        return _loop;
    },
    set loop(loop: boolean) {
        _loop = loop;
        mediaPlaybackSettings.loop = loop;
    },
    get muted(): boolean {
        return mediaPlayer.muted;
    },
    set muted(muted: boolean) {
        mediaPlayer.muted = muted;
        miniPlayer.muted = muted;
        mediaPlaybackSettings.muted = muted;
    },
    get volume(): number {
        return mediaPlayer.volume;
    },
    set volume(volume: number) {
        mediaPlayer.volume = volume;
        miniPlayer.volume = volume;
        mediaPlaybackSettings.volume = volume;
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
};

export default mediaPlayback;

mediaPlayback.muted = mediaPlaybackSettings.muted;
mediaPlayback.volume = mediaPlaybackSettings.volume;

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

if (!isMiniPlayer) {
    // Stop/next after playback ended.
    observeEnded()
        .pipe(takeUntil(killed$))
        .subscribe(() => {
            if (playlist.atEnd) {
                if (_loop && !mediaPlayback.stopAfterCurrent) {
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
}

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

// Use `duration` from media playback if it's missing in metadata.
playlist
    .observeCurrentItem()
    .pipe(
        switchMap((item) =>
            item?.duration === 0
                ? playback.observePlaybackState().pipe(
                      filter(({currentItem}) => currentItem?.id === item?.id),
                      map(({duration}) => duration),
                      filter((duration) => duration !== 0),
                      take(1),
                      tap((duration) =>
                          dispatchMediaObjectChanges({
                              match: (object) => object.src === item.src,
                              values: {duration},
                          })
                      )
                  )
                : EMPTY
        )
    )
    .subscribe(logger);

// Mini player doesn't have a playlist (just the currently loaded item).
if (!isMiniPlayer) {
    // Unlock loading after 300ms. Nothing wil be loaded until then.
    // This avoids spamming media services with play/lookup requests that will soon be skipped over.
    // e.g. clicking the prev/next buttons quickly.
    loadingLocked$
        .pipe(
            debounceTime(300),
            filter((locked) => locked),
            tap(() => unlockLoading())
        )
        .subscribe(logger);

    loadingLocked$
        .pipe(
            distinctUntilChanged(),
            switchMap((locked) => (locked ? EMPTY : playlist.observeCurrentItem())),
            distinctUntilChanged((a, b) => a?.id === b?.id),
            switchMap((item) => (item ? getPlayableItem(item) : of(null))),
            skipWhile((item) => !item),
            tap(load)
        )
        .subscribe(logger);

    // Read ahead.
    playlist
        .observeNextItem()
        .pipe(
            distinctUntilChanged((a, b) => a?.id === b?.id),
            debounceTime(3_000),
            // `getPlayableItem` can trigger updates to the playlist.
            concatMap((item) => (item ? getPlayableItem(item) : of(null)))
        )
        .subscribe(logger);
}

fromEvent(window, 'pagehide').subscribe(kill);

// logging
observePlaying().subscribe(logger.rx('playing'));
playback.observePlaybackStart().subscribe(logger.rx('playbackStart'));
observeDuration().pipe(map(formatTime), distinctUntilChanged()).subscribe(logger.rx('duration'));
observeCurrentTime()
    .pipe(
        filter((time) => Math.floor(time) % 30 === 0),
        map(formatTime),
        distinctUntilChanged()
    )
    .subscribe(logger.rx('currentTime'));
playback.observePlaybackEnd().subscribe(logger.rx('playbackEnd'));
observeEnded().subscribe(logger.rx('ended'));
observeError().subscribe(logger.error);
