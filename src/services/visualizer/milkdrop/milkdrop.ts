import VisualizerProvider from 'types/VisualizerProvider';
import {MilkdropVisualizer} from 'types/Visualizer';
import {analyser} from 'services/audio';
import MilkdropPlayer from './MilkdropPlayer';
import {getVisualizers, observeVisualizers} from './visualizers';

const milkdropPlayer = new MilkdropPlayer(analyser);

const milkdrop: VisualizerProvider<MilkdropVisualizer> = {
    id: 'milkdrop',
    name: 'Butterchurn (Milkdrop)',
    externalUrl: 'https://butterchurnviz.com/',
    player: milkdropPlayer,
    get visualizers() {
        return getVisualizers();
    },
    observeVisualizers,
};

export default milkdrop;
