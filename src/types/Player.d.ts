import type {Observable} from 'rxjs';

export default interface Player<T> {
    hidden: boolean;
    autoplay: boolean;
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
    play(): void;
    pause(): void;
    stop(): void;
    seek(time: number): void;
    resize(width: number, height: number): void;
}
