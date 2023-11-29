import VisualizerProvider from 'types/VisualizerProvider';
import {AmbientVideoVisualizer} from 'types/Visualizer';
import AmbientVideoPlayer from './AmbientVideoPlayer';
import {getVisualizers, observeVisualizers} from './visualizers';

const ambientvideo: VisualizerProvider<AmbientVideoVisualizer> = {
    id: 'ambientvideo',
    name: 'Ambient Video',
    defaultHidden: true,
    get visualizers() {
        return getVisualizers();
    },
    observeVisualizers,
    createPlayer(audio) {
        if (!this.player) {
            (this as any).player = new AmbientVideoPlayer(audio);
        }
        return this.player!;
    },
};

export default ambientvideo;
