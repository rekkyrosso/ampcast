import Player from 'types/Player';
import Visualizer from 'types/Visualizer';
import VisualizerProvider from 'types/VisualizerProvider';
import ambientvideo from './ambientvideo';
import ampshader from './ampshader';
import audiomotion from './audiomotion';
import milkdrop from './milkdrop';
import spotifyviz from './spotifyviz';
import waveform from './waveform';

export function getAllVisualizerProviders(): readonly VisualizerProvider<Visualizer>[] {
    return [ambientvideo, ampshader, audiomotion, milkdrop, spotifyviz, waveform];
}

export function getVisualizerProvider(providerId: string): VisualizerProvider<Visualizer> | undefined {
    return getAllVisualizerProviders().find((provider) => provider.id === providerId);
}

export function getVisualizers(providerId: string): readonly Visualizer[] {
    return getVisualizerProvider(providerId)?.visualizers || [];
}

export function getVisualizer(providerId: string, name: string): Visualizer | undefined {
    return getVisualizers(providerId).find((visualizer) => visualizer.name === name);
}

export function getVisualizerPlayer(providerId: string): Player<Visualizer> | undefined {
    return getVisualizerProvider(providerId)?.player;
}
