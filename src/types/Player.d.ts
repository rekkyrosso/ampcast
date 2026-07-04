import type {Observable} from 'rxjs';
import PlaylistItem from './PlaylistItem';

// All times are in seconds.

export default interface Player<T> {
    autoplay: boolean;
    hidden: boolean;
    loop: boolean;
    muted: boolean;
    volume: number;
    observeCurrentTime(): Observable<number>;
    observeDuration(): Observable<number>;
    observeEnded(): Observable<void>;
    observeError(): Observable<unknown>;
    observePlaying(): Observable<void>;
    appendTo(parentElement: HTMLElement): void;
    canPlay(src: T): boolean;
    load(src: T): void;
    loadNext?(src: T | null): void;
    pause(): void;
    play(): void;
    resize(width: number, height: number): void;
    seek(time: number): void;
    stop(): void;
    // Radio playback.
    observeCanSkipNext?(): Observable<boolean>;
    observeCanSkipPrev?(): Observable<boolean>;
    observeNowPlaying?(item: PlaylistItem): Observable<PlaylistItem>;
    skipNext?(): Promise<void>;
    skipPrev?(): Promise<void>;
}
