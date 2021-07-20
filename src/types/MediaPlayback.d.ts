import type {Observable} from 'rxjs';
import PlaylistItem from './PlaylistItem';
import Player from './Player';

export default interface MediaPlayback extends Player<PlaylistItem | null> {
    observePlaybackStart(): Observable<PlaybackState>;
    observePlaybackEnd(): Observable<PlaybackState>;
    observePlaybackProgress(interval: number): Observable<PlaybackState>;
    observePlaybackState(): Observable<PlaybackState>;
    observePaused(): Observable<boolean>;
    next(): void;
    prev(): void;
    shuffle(): void;
}
