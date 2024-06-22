import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {AmpShaderVisualizer} from 'types/Visualizer';
import visualizerSettings from 'services/visualizer/visualizerSettings';

const visualizers$ = new BehaviorSubject<readonly AmpShaderVisualizer[]>([]);

export function getVisualizers(): readonly AmpShaderVisualizer[] {
    return visualizers$.getValue();
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
    if (presets) {
        visualizers$.next(presets);
    }
}

if (visualizerSettings.provider === 'ampshader') {
    loadVisualizers();
} else {
    setTimeout(loadVisualizers, 1000);
}
