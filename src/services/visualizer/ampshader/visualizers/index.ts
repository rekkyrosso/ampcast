import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {AmpShaderVisualizer} from 'types/Visualizer';

const visualizers$ = new BehaviorSubject<readonly AmpShaderVisualizer[]>([]);

export function getVisualizers(): readonly AmpShaderVisualizer[] {
    return visualizers$.getValue();
}

export function observeVisualizers(): Observable<readonly AmpShaderVisualizer[]> {
    return visualizers$;
}

setTimeout(async () => {
    const {default: presets} = await import(
        /* webpackChunkName: "ampshader-presets" */
        /* webpackMode: "lazy-once" */
        './presets'
    );
    if (presets) {
        visualizers$.next(presets);
    }
}, 1000);
