import {from, map, mergeMap, skipWhile, tap} from 'rxjs';
import Player from 'types/Player';
import Visualizer from 'types/Visualizer';
import VisualizerProvider from 'types/VisualizerProvider';
import ambientvideo from './ambientvideo';
import ampshader from './ampshader';
import audiomotion from './audiomotion';
import butterchurn from './butterchurn';
import spotifyviz from './spotifyviz';
import waveform from './waveform';
import visualizerSettings from './visualizerSettings';
import {Logger} from 'utils';

const logger = new Logger('visualizerProviders');

export function getAllVisualizerProviders(): readonly VisualizerProvider<Visualizer>[] {
    return [ambientvideo, ampshader, audiomotion, butterchurn, spotifyviz, waveform];
}

export function getEnabledVisualizerProviders(): readonly VisualizerProvider<Visualizer>[] {
    return getAllVisualizerProviders().filter(
        (provider) => provider.id !== 'ambientvideo' || visualizerSettings.ambientVideoEnabled
    );
}

export function getVisualizerProvider(
    providerId: string
): VisualizerProvider<Visualizer> | undefined {
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

// Size logging.

from(getAllVisualizerProviders())
    .pipe(
        mergeMap((provider) =>
            provider.observeVisualizers().pipe(
                map((visualizers) => visualizers.length),
                skipWhile((size) => size === 0),
                tap((size) => logger.log(`${provider.id} (total=${size})`))
            )
        )
    )
    .subscribe(logger);
