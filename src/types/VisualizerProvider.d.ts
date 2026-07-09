import type {Observable} from 'rxjs';
import AudioManager from './AudioManager';
import Player from './Player';
import Visualizer from './Visualizer';
import {VisualizerSettingsComponent} from './VisualizerComponents';

export default interface VisualizerProvider<T extends Visualizer = Visualizer> {
    readonly id: T['providerId'];
    readonly name: string;
    readonly shortName?: string;
    readonly player?: Player<T>;
    readonly visualizers: readonly T[];
    readonly externalUrl?: string;
    readonly defaultHidden?: boolean;
    readonly Components?: {
        readonly Settings?: React.FC<VisualizerSettingsComponent>;
    };
    createPlayer(audio: AudioManager): Player<T>;
    observeVisualizers(): Observable<readonly T[]>;
}
