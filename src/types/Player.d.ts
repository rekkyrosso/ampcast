import type {Observable} from 'rxjs';

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
    load(src: T): void;
    loadNext?(src: T | null): void;
    play(): void;
    pause(): void;
    stop(): void;
    seek(time: number): void;
    resize(width: number, height: number): void;
}
