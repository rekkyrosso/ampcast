import type {Observable} from 'rxjs';
import AudioManager from './AudioManager';
import Player from './Player';
import Visualizer from './Visualizer';

export default interface VisualizerProvider<T extends Visualizer> {
    readonly id: T['providerId'];
    readonly name: string;
    readonly player?: Player<T>;
    readonly visualizers: readonly T[];
    readonly externalUrl?: string;
    readonly defaultHidden?: boolean;
    createPlayer(audio: AudioManager): Player<T>;
    observeVisualizers(): Observable<readonly T[]>;
}
