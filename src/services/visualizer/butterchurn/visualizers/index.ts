import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {ButterchurnVisualizer} from 'types/Visualizer';

const visualizers$ = new BehaviorSubject<readonly ButterchurnVisualizer[]>([]);

export function getVisualizers(): readonly ButterchurnVisualizer[] {
    return visualizers$.value;
}

export function observeVisualizers(): Observable<readonly ButterchurnVisualizer[]> {
    return visualizers$;
}

async function loadVisualizers(): Promise<void> {
    const {default: basePresets} = await import(
        /* webpackChunkName: "butterchurn-presets" */
        /* webpackMode: "lazy-once" */
        'butterchurn-presets/dist/base.min'
    );
    addPresets(basePresets);

    const {default: extraPresets} = await import(
        /* webpackChunkName: "butterchurn-presets-extra" */
        /* webpackMode: "lazy-once" */
        'butterchurn-presets/dist/extra.min'
    );
    addPresets(extraPresets);

    const {default: imagePresets} = await import(
        /* webpackChunkName: "butterchurn-presets-image" */
        /* webpackMode: "lazy-once" */
        'butterchurn-presets/dist/image.min'
    );
    addPresets(imagePresets);
}

function addPresets(presets: Record<string, MilkdropRawData>) {
    const providerId = 'butterchurn';
    const ignore = [
        // These don't seem to work.
        'flexi - inter state',
        // These come from "imagePresets".
        // Maybe they work better as overlays?
        'Zylot - In death there is life (Geiss Layered Mix) (Jelly)',
        'martin - attack of the beast',
        '_Mig_009',
        'cope - soar (v2.0)'
    ];
    visualizers$.next(
        getVisualizers().concat(
            Object.keys(presets)
                .filter((name) => !ignore.includes(name))
                .map((name) => ({providerId, name, data: presets[name]}))
        )
    );
}

loadVisualizers();
