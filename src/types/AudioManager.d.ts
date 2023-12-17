import type {Observable} from 'rxjs';

export default interface AudioManager {
    observeReady(): Observable<AudioManager>; // needs a user click
    readonly context: AudioContext;
    readonly source: AudioNode;
    readonly streamingSupported: boolean;
    volume: number;
}
