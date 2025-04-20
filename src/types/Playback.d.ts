import type {Observable} from 'rxjs';
import PlaylistItem from './PlaylistItem';
import PlaybackState from './PlaybackState';

export default interface Playback {
    paused: boolean;
    currentItem: PlaylistItem | null;
    currentTime: number;
    duration: number;
    observePlaybackState(): Observable<PlaybackState>;
    observePlaybackStart(): Observable<PlaybackState>;
    observePlaybackEnd(): Observable<PlaybackState>;
    observeCurrentItem(): Observable<PlaylistItem | null>;
    observeCurrentTime(): Observable<number>;
    observeDuration(): Observable<number>;
    observePaused(): Observable<boolean>;
    getPlaybackId(): string;
    getPlaybackState(): PlaybackState;
    ended(): void;
    pause(): void;
    play(): void;
    playing(): void;
    stop(): void;
    suspend(): void;
    unsuspend(): void;
}
