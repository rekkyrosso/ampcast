import Player from 'types/Player';
import Visualizer from 'types/Visualizer';
import VisualizerProvider from 'types/VisualizerProvider';
import ambientvideo from './visualizers/ambientvideo';
import ampshader from './visualizers/ampshader';
import audiomotion from './visualizers/audiomotion';
import milkdrop from './visualizers/milkdrop';
import spotifyviz from './visualizers/spotifyviz';
import waveform from './visualizers/waveform';

export function getAllProviders(): readonly VisualizerProvider<Visualizer>[] {
    return [ambientvideo, ampshader, audiomotion, milkdrop, spotifyviz, waveform];
}

export function getProvider(providerId: string): VisualizerProvider<Visualizer> | undefined {
    return getAllProviders().find((provider) => provider.id === providerId);
}

export function getVisualizers(providerId: string): readonly Visualizer[] {
    return getProvider(providerId)?.visualizers || [];
}

export function getVisualizer(providerId: string, name: string): Visualizer | null {
    return (
        getVisualizers(providerId).find((visualizer) => visualizer.name === name) ||
        null
    );
}

export function getPlayer(providerId: string): Player<Visualizer> | null {
    return getProvider(providerId)?.player || null;
}
