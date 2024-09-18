import type {Observable} from 'rxjs';
import {BehaviorSubject, map, mergeMap, skipWhile, switchMap, tap} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {loadLibrary, Logger} from 'utils';
import visualizerSettings from './visualizerSettings';

const logger = new Logger('visualizerProviders');

const visualizerProviders$ = new BehaviorSubject<readonly VisualizerProvider[]>([]);

export function observeVisualizerProviders(): Observable<readonly VisualizerProvider[]> {
    return visualizerProviders$;
}

function getVisualizerProviders(): readonly VisualizerProvider[] {
    return visualizerProviders$.value;
}

export function getEnabledVisualizerProviders(): readonly VisualizerProvider[] {
    return getVisualizerProviders().filter(
        (provider) => provider.id !== 'ambientvideo' || visualizerSettings.ambientVideoEnabled
    );
}

export function getVisualizerProvider(providerId: string): VisualizerProvider | undefined {
    return getVisualizerProviders().find((provider) => provider.id === providerId);
}

export async function loadVisualizers(): Promise<readonly VisualizerProvider[]> {
    if (getVisualizerProviders().length === 0) {
        await loadLibrary('visualizers');
        const {default: visualizers} = await import(
            /* webpackMode: "weak" */
            './visualizers'
        );
        if (getVisualizerProviders().length === 0) {
            visualizerProviders$.next(visualizers);
        }
    }
    return getVisualizerProviders();
}

// Log visualizer counts.
observeVisualizerProviders()
    .pipe(
        switchMap((providers) => providers),
        mergeMap((provider) =>
            provider.observeVisualizers().pipe(
                map((visualizers) => visualizers.length),
                skipWhile((count) => count === 0),
                tap((count) => logger.log(`${provider.id} (count=${count})`))
            )
        )
    )
    .subscribe(logger);
