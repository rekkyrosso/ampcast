import VisualizerProvider from 'types/VisualizerProvider';
import {ButterchurnVisualizer} from 'types/Visualizer';
import ButterchurnPlayer from './ButterchurnPlayer';
import {getVisualizers, observeVisualizers} from './visualizers';

const butterchurn: VisualizerProvider<ButterchurnVisualizer> = {
    id: 'butterchurn',
    name: 'Butterchurn (Milkdrop)',
    externalUrl: 'https://butterchurnviz.com/',
    get visualizers() {
        return getVisualizers();
    },
    observeVisualizers,
    createPlayer(audio) {
        if (!this.player) {
            (this as any).player = new ButterchurnPlayer(audio);
        }
        return this.player!;
    },
};

export default butterchurn;
