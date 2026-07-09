import type {Observable} from 'rxjs';
import {BehaviorSubject, filter, map, mergeMap, of, skipWhile, switchMap, tap} from 'rxjs';
import Visualizer from 'types/Visualizer';
import VisualizerComponents from 'types/VisualizerComponents';
import VisualizerProvider from 'types/VisualizerProvider';
import {exists, loadLibrary, Logger} from 'utils';

const logger = new Logger('visualizerProviders');

const visualizerComponents$ = new BehaviorSubject<VisualizerComponents | null>(null);
const visualizerProviders$ = new BehaviorSubject<readonly VisualizerProvider[]>([]);

export function observeVisualizerComponents(): Observable<VisualizerComponents> {
    return visualizerComponents$.pipe(filter(exists));
}

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

export async function loadVisualizers(): Promise<void> {
    if (getVisualizerProviders().length === 0) {
        await loadLibrary('visualizers');
        const {visualizers, Components} = await import(
            /* webpackMode: "weak" */
            './visualizers'
        );
        if (getVisualizerProviders().length === 0) {
            visualizerProviders$.next(visualizers);
            visualizerComponents$.next(Components);
        }
    }
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
