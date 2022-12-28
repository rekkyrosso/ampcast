import {BehaviorSubject, skipWhile, take, tap} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {MilkdropVisualizer} from 'types/Visualizer';
import {analyser} from 'services/audio';
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
    const providerId = 'milkdrop';
    const {default: presets} = await import(
        /* webpackChunkName: "butterchurn-presets" */
        /* webpackMode: "lazy-once" */
        'butterchurn-presets'
    );
    if (presets) {
        presets$.next(
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
            presets$.next(
                presets$.getValue().concat(
                    Object.keys(extras).map((name) => {
                        return {providerId, name, data: extras[name]};
                    })
                )
            );
        }
    }
}, 1000);

presets$
    .pipe(
        skipWhile((presets) => presets.length === 0),
        tap((presets) => console.log('Butterchurn presets:', presets.length)),
        take(2)
    )
    .subscribe();
