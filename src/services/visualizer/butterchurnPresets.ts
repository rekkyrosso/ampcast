import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {MilkdropVisualizer} from 'types/Visualizer';
import {loadScript} from 'utils';

const presets$ = new BehaviorSubject<MilkdropVisualizer[]>([]);

setTimeout(async () => {
    await loadScript('./lib/butterchurn-presets-base.min.js');
    const providerId = 'milkdrop';
    const presets = window.butterchurnPresets;
    if (presets) {
        presets$.next(
            Object.keys(presets).map((name) => {
                return {providerId, name, data: presets[name]};
            })
        );
        setTimeout(async () => {
            await loadScript('./lib/butterchurn-presets-extra.min.js');
            const presets = window.butterchurnPresetsExtra;
            if (presets) {
                presets$.next(
                    presets$.getValue().concat(
                        Object.keys(presets).map((name) => {
                            return {providerId, name, data: presets[name]};
                        })
                    )
                );
            }
        }, 1000);
    }
}, 1000);

export function observe(): Observable<readonly MilkdropVisualizer[]> {
    return presets$;
}

export function get(): readonly MilkdropVisualizer[] {
    return presets$.getValue();
}

export function find(name: string): MilkdropVisualizer | null {
    return presets$.getValue().find((preset) => preset.name === name) || null;
}

export default {
    get size(): number {
        return get().length;
    },
    observe,
    find,
    get,
};
