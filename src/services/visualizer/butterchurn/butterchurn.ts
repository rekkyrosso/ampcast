import VisualizerProvider from 'types/VisualizerProvider';
import {ButterchurnVisualizer} from 'types/Visualizer';
import {analyser} from 'services/audio';
import ButterchurnPlayer from './ButterchurnPlayer';
import {getVisualizers, observeVisualizers} from './visualizers';

const butterchurnPlayer = new ButterchurnPlayer(analyser);

const butterchurn: VisualizerProvider<ButterchurnVisualizer> = {
    id: 'butterchurn',
    name: 'Butterchurn (Milkdrop)',
    externalUrl: 'https://butterchurnviz.com/',
    player: butterchurnPlayer,
    get visualizers() {
        return getVisualizers();
    },
    observeVisualizers,
};

export default butterchurn;
