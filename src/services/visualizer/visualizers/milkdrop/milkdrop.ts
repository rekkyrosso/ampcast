import {BehaviorSubject, skipWhile, take, tap} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {MilkdropVisualizer} from 'types/Visualizer';
import {analyser} from 'services/audio';
import {loadScript} from 'utils';
import MilkdropPlayer from './MilkdropPlayer';

const presets$ = new BehaviorSubject<readonly MilkdropVisualizer[]>([]);

const milkdropPlayer = new MilkdropPlayer(analyser);

const milkdrop: VisualizerProvider<MilkdropVisualizer> = {
    id: 'milkdrop',
    name: 'Milkdrop',
    url: 'https://butterchurnviz.com/',
    player: milkdropPlayer,
    get visualizers() {
        return presets$.getValue();
    },
    observeVisualizers: () => presets$,
};

export default milkdrop;

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

presets$
    .pipe(
        skipWhile((presets) => presets.length === 0),
        tap((presets) => console.log('Butterchurn presets:', presets.length)),
        take(2)
    )
    .subscribe();
