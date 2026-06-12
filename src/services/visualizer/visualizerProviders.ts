import type {Observable} from 'rxjs';
import {BehaviorSubject, map, mergeMap, of, skipWhile, switchMap, tap} from 'rxjs';
import Visualizer from 'types/Visualizer';
import VisualizerProvider from 'types/VisualizerProvider';
import {loadLibrary, Logger} from 'utils';

const logger = new Logger('visualizerProviders');

const visualizerProviders$ = new BehaviorSubject<readonly VisualizerProvider[]>([]);

export function observeVisualizerProviders(): Observable<readonly VisualizerProvider[]> {
    return visualizerProviders$;
}

export function observeVisualizersByProviderId(
    providerId: string
): Observable<readonly Visualizer[]> {
    return observeVisualizerProviders().pipe(
        switchMap((providers) =>
            providers.length === 0
                ? of([])
                : of(getVisualizerProvider(providerId)).pipe(
                      switchMap((provider) => (provider ? provider.observeVisualizers() : of([])))
                  )
        )
    );
}

export function getVisualizerProviders(): readonly VisualizerProvider[] {
    return visualizerProviders$.value;
}

export function getVisualizer(providerId: string, name: string): Visualizer | undefined {
    return getVisualizers(providerId).find((visualizer) => visualizer.name === name);
}

export function getVisualizers(providerId: string): readonly Visualizer[] {
    return getVisualizerProvider(providerId)?.visualizers || [];
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
