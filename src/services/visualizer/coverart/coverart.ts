import {of} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {CoverArtVisualizer} from 'types/Visualizer';
import CovertArtPlayer from './CovertArtPlayer';
import visualizers from './visualizers';

const coverart: VisualizerProvider<CoverArtVisualizer> = {
    id: 'coverart',
    name: 'Cover Art',
    visualizers,
    observeVisualizers: () => of(visualizers),
    createPlayer(audio) {
        if (!this.player) {
            (this as any).player = new CovertArtPlayer(audio);
        }
        return this.player!;
    },
};

export default coverart;
