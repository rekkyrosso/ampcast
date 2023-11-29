import type {Observable} from 'rxjs';
import PlaybackState from './PlaybackState';

export default interface Playback {
    paused: boolean;
    observePlaybackReady(): Observable<void>;
    observePlaybackState(): Observable<PlaybackState>;
    observePlaybackStart(): Observable<PlaybackState>;
    observePlaybackEnd(): Observable<PlaybackState>;
    observePlaybackProgress(interval: number): Observable<PlaybackState>;
    observeCurrentTime(): Observable<number>;
    observeDuration(): Observable<number>;
    observePaused(): Observable<boolean>;
    getCurrentTime(): number;
    setCurrentTime(currentTime: number): void;
    getDuration(): number;
    setDuration(duration: number): void;
    play(): void;
    pause(): void;
    ready(): void;
    stop(): void;
    started(): void;
    ended(): void;
}
