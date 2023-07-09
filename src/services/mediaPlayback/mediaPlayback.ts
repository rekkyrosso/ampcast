import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    combineLatest,
    debounceTime,
    distinctUntilChanged,
    filter,
    fromEvent,
    map,
    of,
    switchMap,
    takeUntil,
    tap,
    withLatestFrom,
} from 'rxjs';
import MediaPlayback from 'types/MediaPlayback';
import PlaybackState from 'types/PlaybackState';
import PlaylistItem from 'types/PlaylistItem';
import lookup from 'services/lookup';
import {hasPlayableSrc} from 'services/mediaServices';
import playlist from 'services/playlist';
import visualizerPlayer from 'services/visualizer/visualizerPlayer';
import {formatTime, LiteStorage, Logger} from 'utils';
import mediaPlayer from './mediaPlayer';
import playback from './playback';
import './scrobbler';

const logger = new Logger('mediaPlayback');

const appSettings = new LiteStorage('mediaPlayback');
const sessionSettings = new LiteStorage('mediaPlayback', 'session');

const loadingLocked$ = new BehaviorSubject(false);
const killed$ = new Subject<void>();

let direction: 'backward' | 'forward' = 'forward';

export function observeCurrentItem(): Observable<PlaylistItem | null> {
    return playlist.observeCurrentItem();
}

export function observeNextItem(): Observable<PlaylistItem | null> {
    return playlist.observeNextItem();
}

export function observeCurrentTime(): Observable<number> {
    return playback.observeCurrentTime();
}

export function observeDuration(): Observable<number> {
    return playback.observeDuration();
}

export function observeEnded(): Observable<void> {
    return mediaPlayer.observeEnded();
}

export function observeError(): Observable<unknown> {
    return mediaPlayer.observeError();
}

export function observePaused(): Observable<boolean> {
    return playback.observePaused();
}

export function observePlaybackStart(): Observable<PlaybackState> {
    return playback.observePlaybackStart();
}

export function observePlaybackEnd(): Observable<PlaybackState> {
    return playback.observePlaybackEnd();
}

export function observePlaybackProgress(interval: number): Observable<PlaybackState> {
    return playback.observePlaybackProgress(interval);
}

export function observePlaybackState(): Observable<PlaybackState> {
    return playback.observePlaybackState();
}

export function observePlaying(): Observable<void> {
    return mediaPlayer.observePlaying();
}

export function appendTo(parentElement: HTMLElement): void {
    const container = parentElement.querySelector('#playback') as HTMLElement;
    mediaPlayer.appendTo(container);
    visualizerPlayer.appendTo(container);
}

export function load(item: PlaylistItem | null): void {
    logger.log('load', {item});
    mediaPlayer.load(item);
    if (mediaPlayer.autoplay) {
        playback.play();
    }
}

export function play(): void {
    logger.log('play');
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
    direction = 'backward';
    if (!playlist.atStart) {
        mediaPlayback.stopAfterCurrent = false;
        lockLoading();
        playlist.prev();
    }
}

export function next(): void {
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

export function shuffle(): void {
    playlist.shuffle();
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
            return {...item, ...foundItem} as PlaylistItem;
        }
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

mediaPlayer
    .observeError()
    .pipe(
        debounceTime(2000),
        withLatestFrom(observePaused(), observePlaylistAtStart(), observePlaylistAtEnd()),
        takeUntil(killed$)
    )
    .subscribe(([, paused, atStart, atEnd]) => {
        if (!paused) {
            if (atEnd || (atStart && direction === 'backward')) {
                stop();
            } else if (direction === 'backward') {
                playlist.prev();
            } else {
                playlist.next();
            }
        }
    });

playlist
    .observeSize()
    .pipe(
        map((size) => size === 0),
        distinctUntilChanged(),
        filter((isEmpty) => isEmpty)
    )
    .subscribe(stop);

// Unlock loading after 250ms.
// `mediaPlayer` won't actually load anything until then.
// This avoids spamming media services with play requests that will soon be skipped over.
// This can happen if you click the prev/next buttons quickly or you rapidly
// delete the currently playing item (eject).
loadingLocked$
    .pipe(
        debounceTime(250),
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
        tap(load)
    )
    .subscribe(logger);

loadingLocked$
    .pipe(
        distinctUntilChanged(),
        switchMap((locked) => (locked ? EMPTY : observeNextItem())),
        distinctUntilChanged((a, b) => a?.id === b?.id),
        debounceTime(3_000),
        switchMap((item) => (item ? getPlayableItem(item) : EMPTY))
    )
    .subscribe(logger);

fromEvent(window, 'pagehide').subscribe(kill);

// logging
observeDuration().pipe(map(formatTime), distinctUntilChanged()).subscribe(logger.rx('duration'));
observeCurrentTime()
    .pipe(
        filter((time) => Math.round(time) % 30 === 0),
        map(formatTime)
    )
    .subscribe(logger.rx('currentTime'));
observePlaying().subscribe(logger.rx('playing'));
observeEnded().subscribe(logger.rx('ended'));
observePlaybackStart().subscribe(logger.rx('playbackStart'));
observePlaybackEnd().subscribe(logger.rx('playbackEnd'));
