import type {Observable} from 'rxjs';
import {combineLatest, fromEvent} from 'rxjs';
import {distinctUntilChanged, filter, map, withLatestFrom} from 'rxjs/operators';
import MediaPlayback from 'types/MediaPlayback';
import PlaybackState from 'types/PlaybackState';
import PlaylistItem from 'types/PlaylistItem';
import playlist from 'services/playlist';
import visualizer from 'services/visualizer';
import {LiteStorage, Logger} from 'utils';
import mediaPlayer from './mediaPlayer';
import playback from './playback';

console.log('module::mediaPlayback');

const logger = new Logger('mediaPlayback');

const appSettings = new LiteStorage('mediaPlayback');
const sessionSettings = new LiteStorage('mediaPlayback', sessionStorage);

let direction: 'backward' | 'forward' = 'forward';

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
    return playback.observeState();
}

export function observePlaying(): Observable<void> {
    return mediaPlayer.observePlaying();
}

export function appendTo(parentElement: HTMLElement): void {
    const playersContainer = parentElement.querySelector('#players') as HTMLElement;
    const visualizerContainer = parentElement.querySelector('#visualizers') as HTMLElement;
    mediaPlayer.appendTo(playersContainer);
    visualizer.appendTo(visualizerContainer);
}

export function load(item: PlaylistItem | null): void {
    logger.log('load', item?.title);
    mediaPlayer.load(item);
}

export function play(): void {
    logger.log('play');
    direction = 'forward';
    playback.play();
    if (!playback.paused) {
        mediaPlayer.play();
    }
}

export function pause(): void {
    logger.log('pause');
    playback.pause();
    mediaPlayer.pause();
}

export function seek(time: number): void {
    mediaPlayer.seek(time);
}

export function stop(): void {
    logger.log('stop');
    playback.stop();
    mediaPlayer.stop();
}

export function resize(width: number, height: number): void {
    mediaPlayer.resize(width, height);
    visualizer.resize(width, height);
}

export function prev(): void {
    direction = 'backward';
    playlist.prev();
}

export function next(): void {
    direction = 'forward';
    playlist.next();
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

const mediaPlayback: MediaPlayback = {
    get autoplay(): boolean {
        return mediaPlayer.autoplay;
    },
    set autoplay(autoplay: boolean) {
        mediaPlayer.autoplay = autoplay;
        visualizer.autoplay = autoplay;
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
        sessionSettings.setItem('muted', String(muted));
        mediaPlayer.muted = muted;
    },
    get volume(): number {
        return mediaPlayer.volume;
    },
    set volume(volume: number) {
        appSettings.setItem('volume', String(volume));
        mediaPlayer.volume = volume;
    },
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

mediaPlayback.muted = sessionSettings.getItem('muted') === 'true';
mediaPlayback.volume = Number(appSettings.getItem('volume')) || 1;

mediaPlayer.observeCurrentTime().subscribe((time) => playback.setCurrentTime(time));
mediaPlayer.observeDuration().subscribe((duration) => playback.setDuration(duration));
mediaPlayer.observePlaying().subscribe(() => playback.started());
mediaPlayer.observeEnded().subscribe(() => playback.ended());

mediaPlayer.observePlaying().subscribe(() => (direction = 'forward'));

mediaPlayer
    .observeEnded()
    .pipe(withLatestFrom(observePlaylistAtEnd()))
    .subscribe(([, atEnd]) => {
        if (atEnd) {
            stop();
        } else {
            next();
        }
    });

mediaPlayer
    .observeError()
    .pipe(withLatestFrom(observePaused(), observePlaylistAtStart(), observePlaylistAtEnd()))
    .subscribe(([, paused, atStart, atEnd]) => {
        if (atEnd || (atStart && direction === 'backward')) {
            stop();
        } else if (!paused) {
            if (direction === 'backward') {
                prev();
            } else {
                next();
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

playlist.observeCurrentItem().subscribe(load);

fromEvent(window, 'pagehide').subscribe(stop);

// logging
observeDuration().subscribe(logger.all('duration'));
observeCurrentTime()
    .pipe(filter((time) => Math.round(time) % 10 === 0))
    .subscribe(logger.all('currentTime'));
observePlaying().subscribe(logger.all('playing'));
observeEnded().subscribe(logger.all('ended'));
observePlaybackStart().subscribe(logger.all('playbackStart'));
observePlaybackEnd().subscribe(logger.all('playbackEnd'));
