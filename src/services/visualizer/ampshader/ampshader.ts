import VisualizerProvider from 'types/VisualizerProvider';
import {AmpShaderVisualizer} from 'types/Visualizer';
import {simpleAnalyser} from 'services/audio';
import AmpShaderPlayer from './AmpShaderPlayer';
import {getVisualizers, observeVisualizers} from './visualizers';

const ampShaderPlayer = new AmpShaderPlayer(simpleAnalyser);

const ampshader: VisualizerProvider<AmpShaderVisualizer> = {
    id: 'ampshader',
    name: 'ampshader',
    player: ampShaderPlayer,
    get visualizers() {
        return getVisualizers();
    },
    observeVisualizers,
};

export default ampshader;
