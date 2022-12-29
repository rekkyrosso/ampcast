import type {Observable} from 'rxjs';
import {BehaviorSubject, map, skipWhile, take, tap} from 'rxjs';
import {MilkdropVisualizer} from 'types/Visualizer';

const visualizers$ = new BehaviorSubject<readonly MilkdropVisualizer[]>([]);

export function getVisualizers(): readonly MilkdropVisualizer[] {
    return visualizers$.getValue();
}

export function observeVisualizers(): Observable<readonly MilkdropVisualizer[]> {
    return visualizers$;
}

setTimeout(async () => {
    const providerId = 'milkdrop';
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

// logging
observeVisualizers()
    .pipe(
        map((visualizers) => visualizers.length),
        skipWhile((size) => size === 0),
        tap((size) => console.log('Butterchurn visualizers:', size)),
        take(2)
    )
    .subscribe();
