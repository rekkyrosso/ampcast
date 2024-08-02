import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {AmpShaderVisualizer} from 'types/Visualizer';

const visualizers$ = new BehaviorSubject<readonly AmpShaderVisualizer[]>([]);

export function getVisualizers(): readonly AmpShaderVisualizer[] {
    return visualizers$.value;
}

export function observeVisualizers(): Observable<readonly AmpShaderVisualizer[]> {
    return visualizers$;
}

async function loadVisualizers(): Promise<void> {
    const {default: presets} = await import(
        /* webpackChunkName: "ampshader-presets" */
        /* webpackMode: "lazy-once" */
        './presets'
    );
    visualizers$.next(presets);
}

loadVisualizers();
