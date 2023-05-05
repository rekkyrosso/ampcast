import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {ButterchurnVisualizer} from 'types/Visualizer';

const visualizers$ = new BehaviorSubject<readonly ButterchurnVisualizer[]>([]);

export function getVisualizers(): readonly ButterchurnVisualizer[] {
    return visualizers$.getValue();
}

export function observeVisualizers(): Observable<readonly ButterchurnVisualizer[]> {
    return visualizers$;
}

setTimeout(async () => {
    const providerId = 'butterchurn';
    const {default: presets} = await import(
        /* webpackChunkName: "butterchurn-presets" */
        /* webpackMode: "lazy-once" */
        'butterchurn-presets'
    );
    if (presets) {
        visualizers$.next(
            Object.keys(presets).map((name) => {
                return {providerId, name, data: presets[name]};
            })
        );
        const {default: extras} = await import(
            /* webpackChunkName: "butterchurn-presets-extra" */
            /* webpackMode: "lazy-once" */
            'butterchurn-presets/dist/extra'
        );
        if (extras) {
            visualizers$.next(
                getVisualizers().concat(
                    Object.keys(extras).map((name) => {
                        return {providerId, name, data: extras[name]};
                    })
                )
            );
        }
    }
}, 1000);
