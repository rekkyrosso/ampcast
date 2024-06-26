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
import PlaybackState from 'types/PlaybackState';
import PlaylistItem from 'types/PlaylistItem';
import {dispatchMediaObjectChanges} from 'services/actions/mediaObjectChanges';
import lookup from 'services/lookup';
import {hasPlayableSrc, getPlaybackType} from 'services/mediaServices';
import playlist from 'services/playlist';
import {formatTime, LiteStorage, Logger} from 'utils';
import mediaPlayer from './mediaPlayer';
import visualizerPlayer from './visualizerPlayer';
import playback, {observePlaybackReady} from './playback';
import './scrobbler';

const logger = new Logger('mediaPlayback');

const appSettings = new LiteStorage('mediaPlayback');
const sessionSettings = new LiteStorage('mediaPlayback', 'session');

const loadingLocked$ = new BehaviorSubject(true);
const killed$ = new Subject<void>();

let direction: 'backward' | 'forward' = 'forward';

export function observeCurrentItem(): Observable<PlaylistItem | null> {
    return playlist.observeCurrentItem();
}

export function observeNextItem(): Observable<PlaylistItem | null> {
    return playlist.observeNextItem();
}

function observeCurrentTime(): Observable<number> {
    return playback.observeCurrentTime();
}

function observeDuration(): Observable<number> {
    return playback.observeDuration();
}

export function observeEnded(): Observable<void> {
    return mediaPlayer.observeEnded();
}

export function observeError(): Observable<unknown> {
    return mediaPlayer.observeError();
}

function observePaused(): Observable<boolean> {
    return playback.observePaused();
}

function observePlaybackStart(): Observable<PlaybackState> {
    return playback.observePlaybackStart();
}

function observePlaybackEnd(): Observable<PlaybackState> {
    return playback.observePlaybackEnd();
}

function observePlaybackProgress(interval: number): Observable<PlaybackState> {
    return playback.observePlaybackProgress(interval);
}

function observePlaybackState(): Observable<PlaybackState> {
    return playback.observePlaybackState();
}

export function observePlaying(): Observable<void> {
    return mediaPlayer.observePlaying();
}

export function appendTo(parentElement: HTMLElement): void {
    mediaPlayer.appendTo(parentElement);
    visualizerPlayer.appendTo(parentElement);
}

export function load(item: PlaylistItem | null): void {
    logger.log('load', {item});
    if (mediaPlayer.autoplay) {
        playback.ready();
    }
    mediaPlayer.load(item);
    if (mediaPlayer.autoplay) {
        playback.play();
    }
}

export function play(): void {
    logger.log('play');
    playback.ready();
    direction = 'forward';
    unlockLoading();
    playback.play();
    if (!playback.paused) {
        mediaPlayer.play();
        visualizerPlayer.play();
    }
}

export function pause(): void {
    logger.log('pause');
    mediaPlayback.stopAfterCurrent = false;
    unlockLoading();
    playback.pause();
    mediaPlayer.pause();
    visualizerPlayer.pause();
}

export function seek(time: number): void {
    logger.log('seek', {time: formatTime(time)});
    mediaPlayer.seek(time);
}

export function stop(): void {
    logger.log('stop');
    mediaPlayback.stopAfterCurrent = false;
    unlockLoading();
    playback.stop();
    mediaPlayer.stop();
    visualizerPlayer.stop();
}

export function resize(width: number, height: number): void {
    mediaPlayer.resize(width, height);
    visualizerPlayer.resize(width, height);
}

export function prev(): void {
    logger.log('prev');
    direction = 'backward';
    if (!playlist.atStart) {
        mediaPlayback.stopAfterCurrent = false;
        lockLoading();
        playlist.prev();
    }
}

export function next(): void {
    logger.log('next');
    direction = 'forward';
    if (!playlist.atEnd) {
        mediaPlayback.stopAfterCurrent = false;
        lockLoading();
        playlist.next();
    }
}

export function eject(): void {
    mediaPlayback.stopAfterCurrent = false;
    lockLoading();
    playlist.eject();
}

export async function shuffle(preserveCurrentlyPlaying?: boolean): Promise<void> {
    return playlist.shuffle(preserveCurrentlyPlaying);
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

function lockLoading() {
    if (!playback.paused && loadingLocked$.getValue() === false) {
        playback.stop();
        mediaPlayer.stop();
        playback.play();
    }
    loadingLocked$.next(true);
}

function unlockLoading(): void {
    loadingLocked$.next(false);
}

function kill(): void {
    killed$.next(undefined);
    stop();
}

async function getPlayableItem(item: PlaylistItem): Promise<PlaylistItem> {
    if (!hasPlayableSrc(item)) {
        const foundItem = await lookup(item);
        if (foundItem) {
            item = {...item, ...foundItem};
        } else {
            return item;
        }
    }
    if (item.playbackType === undefined) {
        const playbackType = await getPlaybackType(item);
        item = {...item, playbackType};
    }
    return item;
}

const mediaPlayback: MediaPlayback = {
    stopAfterCurrent: false,
    get autoplay(): boolean {
        return mediaPlayer.autoplay;
    },
    set autoplay(autoplay: boolean) {
        mediaPlayer.autoplay = autoplay;
        visualizerPlayer.autoplay = autoplay;
    },
    get hidden(): boolean {
        return false;
    },
    get loop(): boolean {
        return false;
    },
    get muted(): boolean {
        return mediaPlayer.muted;
    },
    set muted(muted: boolean) {
        sessionSettings.setBoolean('muted', muted);
        mediaPlayer.muted = muted;
    },
    get paused(): boolean {
        return playback.paused;
    },
    get volume(): number {
        return mediaPlayer.volume;
    },
    set volume(volume: number) {
        appSettings.setNumber('volume', volume);
        mediaPlayer.volume = volume;
    },
    observeCurrentItem,
    observeCurrentTime,
    observeDuration,
    observeEnded,
    observeError,
    observePaused,
    observePlaying,
    observePlaybackStart,
    observePlaybackEnd,
    observePlaybackProgress,
    observePlaybackState,
    appendTo,
    load,
    play,
    pause,
    stop,
    seek,
    resize,
    next,
    prev,
    shuffle,
};

export default mediaPlayback;

mediaPlayback.muted = sessionSettings.getBoolean('muted');
mediaPlayback.volume = appSettings.getNumber('volume', 1);

mediaPlayer.observeCurrentTime().subscribe((time) => playback.setCurrentTime(time));
mediaPlayer.observeDuration().subscribe((duration) => playback.setDuration(duration));
mediaPlayer.observePlaying().subscribe(() => playback.started());
mediaPlayer.observeEnded().subscribe(() => playback.ended());
mediaPlayer.observePlaying().subscribe(() => (direction = 'forward'));

mediaPlayer
    .observeEnded()
    .pipe(withLatestFrom(observePlaylistAtEnd()), takeUntil(killed$))
    .subscribe(([, atEnd]) => {
        if (atEnd) {
            stop();
        } else {
            if (mediaPlayback.stopAfterCurrent) {
                stop();
            } else {
                playlist.next();
            }
        }
    });

// Continue playing if we get a playback error (move to the next track)
observeCurrentItem()
    .pipe(
        distinctUntilChanged((a, b) => a?.id === b?.id),
        switchMap((item) =>
            item
                ? mediaPlayer
                      .observeError()
                      .pipe(
                          debounceTime(2000),
                          withLatestFrom(
                              observePaused(),
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
            if (direction === 'backward') {
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
observeCurrentItem()
    .pipe(
        switchMap((item) =>
            item?.duration === 0
                ? observeDuration().pipe(
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

// Unlock loading after 300ms.
// `mediaPlayer` won't actually load anything until then.
// This avoids spamming media services with play/lookup requests that will soon be skipped over.
// This can happen if you click the prev/next buttons quickly or you rapidly delete the
// currently playing item (eject).
loadingLocked$
    .pipe(
        debounceTime(300),
        filter((locked) => locked)
    )
    .subscribe(() => {
        mediaPlayback.autoplay = !playback.paused;
        loadingLocked$.next(false);
    });

loadingLocked$
    .pipe(
        distinctUntilChanged(),
        switchMap((locked) => (locked ? EMPTY : observeCurrentItem())),
        distinctUntilChanged((a, b) => a?.id === b?.id),
        switchMap((item) => (item ? getPlayableItem(item) : of(null))),
        skipWhile((item) => !item),
        tap(load)
    )
    .subscribe(logger);

// Read ahead.
observeNextItem()
    .pipe(
        distinctUntilChanged((a, b) => a?.id === b?.id),
        debounceTime(3_000),
        concatMap((item) => (item ? getPlayableItem(item) : of(null)))
    )
    .subscribe(logger);

fromEvent(window, 'pagehide').subscribe(kill);

// logging
observePlaybackReady().subscribe(logger.rx('playbackReady'));
observePlaybackStart().subscribe(logger.rx('playbackStart'));
observePlaybackEnd().subscribe(logger.rx('playbackEnd'));
observePlaying().subscribe(logger.rx('playing'));
observeEnded().subscribe(logger.rx('ended'));
observeError().subscribe(logger.error);
observeDuration()
    .pipe(
        skipWhile((duration) => !duration),
        map(formatTime),
        distinctUntilChanged()
    )
    .subscribe(logger.rx('duration'));
observeCurrentTime()
    .pipe(
        filter((time) => Math.round(time) % 30 === 0),
        map(formatTime)
    )
    .subscribe(logger.rx('currentTime'));
