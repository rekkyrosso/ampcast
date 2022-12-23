import {of} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {AmpShaderVisualizer} from 'types/Visualizer';
import {simpleAnalyser} from 'services/audio';
import AmpShaderPlayer from './AmpShaderPlayer';
import presets from './presets';

const ampShaderPlayer = new AmpShaderPlayer(simpleAnalyser);

console.log('ampshader presets:', presets.length);

const ampshader: VisualizerProvider<AmpShaderVisualizer> = {
    id: 'ampshader',
    name: 'ampshader',
    player: ampShaderPlayer,
    visualizers: presets,
    observeVisualizers: () => of(presets),
};

export default ampshader;
