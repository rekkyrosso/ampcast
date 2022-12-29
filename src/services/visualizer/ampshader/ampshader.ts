import {of} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {AmpShaderVisualizer} from 'types/Visualizer';
import {simpleAnalyser} from 'services/audio';
import AmpShaderPlayer from './AmpShaderPlayer';
import visualizers from './visualizers';

const ampShaderPlayer = new AmpShaderPlayer(simpleAnalyser);

const ampshader: VisualizerProvider<AmpShaderVisualizer> = {
    id: 'ampshader',
    name: 'ampshader',
    player: ampShaderPlayer,
    visualizers,
    observeVisualizers: () => of(visualizers),
};

export default ampshader;
