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
    const [basePresets, extraPresets, imagePresets] = await Promise.all([
        loadBasePresets(),
        loadExtraPresets(),
        loadImagePresets(),
    ]);
    const presets = {...basePresets, ...extraPresets, ...imagePresets};
    const providerId = 'butterchurn';
    const ignore = [
        // These don't seem to work.
        'flexi - inter state',
        // These come from "imagePresets".
        // Maybe they work better as overlays?
        'Zylot - In death there is life (Geiss Layered Mix) (Jelly)',
        'martin - attack of the beast',
        '_Mig_009',
        'cope - soar (v2.0)',
    ];
    visualizers$.next(
        Object.keys(presets)
            .filter((name) => !ignore.includes(name))
            .map((name) => ({providerId, name, data: presets[name]}))
    );
}

async function loadBasePresets(): Promise<Record<string, MilkdropRawData>> {
    try {
        const {default: presets} = await import(
            /* webpackChunkName: "butterchurn-presets" */
            /* webpackMode: "lazy-once" */
            'butterchurn-presets/dist/base.min'
        );
        return presets;
    } catch (err) {
        console.error(err);
        return {};
    }
}

async function loadExtraPresets(): Promise<Record<string, MilkdropRawData>> {
    try {
        const {default: presets} = await import(
            /* webpackChunkName: "butterchurn-presets-extra" */
            /* webpackMode: "lazy-once" */
            'butterchurn-presets/dist/extra.min'
        );
        return presets;
    } catch (err) {
        console.error(err);
        return {};
    }
}

async function loadImagePresets(): Promise<Record<string, MilkdropRawData>> {
    try {
        const {default: presets} = await import(
            /* webpackChunkName: "butterchurn-presets-image" */
            /* webpackMode: "lazy-once" */
            'butterchurn-presets/dist/image.min'
        );
        return presets;
    } catch (err) {
        console.error(err);
        return {};
    }
}

loadVisualizers();
