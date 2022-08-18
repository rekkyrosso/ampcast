import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {loadScript} from 'utils';

export interface ButterchurnPreset {
    readonly name: string;
    readonly data: MilkdropRawData;
}

const presets$ = new BehaviorSubject<ButterchurnPreset[]>([]);

setTimeout(async () => {
    await loadScript('./lib/butterchurn-presets-base.min.js');
    const presets = window.butterchurnPresets;
    if (presets) {
        presets$.next(
            Object.keys(presets).map((name) => {
                return {name, data: presets[name]};
            })
        );
        setTimeout(async () => {
            await loadScript('./lib/butterchurn-presets-extra.min.js');
            const presets = window.butterchurnPresetsExtra;
            if (presets) {
                presets$.next(
                    presets$.getValue().concat(
                        Object.keys(presets).map((name) => {
                            return {name, data: presets[name]};
                        })
                    )
                );
            }
        }, 1000);
    }
}, 1000);

export function observe(): Observable<readonly ButterchurnPreset[]> {
    return presets$;
}

export function get(): readonly ButterchurnPreset[] {
    return presets$.getValue();
}

export function getNames(): readonly string[] {
    return presets$.getValue().map((preset) => preset.name);
}

export function find(name: string): ButterchurnPreset | null {
    return presets$.getValue().find((preset) => preset.name === name) || null;
}

export default {
    get size(): number {
        return get().length;
    },
    observe,
    find,
    get,
    getNames,
};
