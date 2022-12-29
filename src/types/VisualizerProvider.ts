import type {Observable} from 'rxjs';
import Visualizer from './Visualizer';
import Player from './Player';

export default interface VisualizerProvider<T extends Visualizer> {
    readonly id: T['providerId'];
    readonly name: string;
    readonly player: Player<T>;
    readonly visualizers: readonly T[];
    readonly externalUrl?: string;
    readonly defaultHidden?: boolean;
    observeVisualizers(): Observable<readonly T[]>;
}
