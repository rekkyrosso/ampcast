import VisualizerProvider from 'types/VisualizerProvider';
import {AmbientVideoVisualizer} from 'types/Visualizer';
import ambientVideoPlayer from './ambientVideoPlayer';
import {getVisualizers, observeVisualizers} from './visualizers';

const ambientvideo: VisualizerProvider<AmbientVideoVisualizer> = {
    id: 'ambientvideo',
    name: 'Ambient Video',
    defaultHidden: true,
    player: ambientVideoPlayer,
    get visualizers() {
        return getVisualizers();
    },
    observeVisualizers,
};

export default ambientvideo;
