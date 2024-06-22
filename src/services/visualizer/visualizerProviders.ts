import type {Observable} from 'rxjs';
import {BehaviorSubject, map, mergeMap, skipWhile, take, tap} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import audio from 'services/audio';
import {Logger, loadScript} from 'utils';
import visualizerSettings from './visualizerSettings';

const logger = new Logger('visualizerProviders');

const visualizerProviders$ = new BehaviorSubject<readonly VisualizerProvider[]>([]);

export function observeVisualizerProviders(): Observable<readonly VisualizerProvider[]> {
    return visualizerProviders$.pipe(
        skipWhile((providers) => providers.length === 0),
        take(1)
    );
}

export function getAllVisualizerProviders(): readonly VisualizerProvider[] {
    return visualizerProviders$.value;
}

export function getEnabledVisualizerProviders(): readonly VisualizerProvider[] {
    return getAllVisualizerProviders().filter(
        (provider) => provider.id !== 'ambientvideo' || visualizerSettings.ambientVideoEnabled
    );
}

export function getVisualizerProvider(providerId: string): VisualizerProvider | undefined {
    return getAllVisualizerProviders().find((provider) => provider.id === providerId);
}

export async function loadVisualizers(): Promise<readonly VisualizerProvider[]> {
    await loadScript(`/v${__app_version__}/lib/visualizers.js`);
    const {default: visualizers} = await import(
        /* webpackMode: "weak" */
        './visualizers'
    );
    return visualizers;
}

audio
    .observeReady()
    .pipe(mergeMap(() => loadVisualizers()))
    .subscribe(visualizerProviders$);

// Size logging.

observeVisualizerProviders()
    .pipe(
        mergeMap((providers) => providers),
        mergeMap((provider) =>
            provider.observeVisualizers().pipe(
                map((visualizers) => visualizers.length),
                skipWhile((size) => size === 0),
                tap((size) => logger.log(`${provider.id} (total=${size})`))
            )
        )
    )
    .subscribe(logger);
