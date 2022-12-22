import {of} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {AmpShaderVisualizer} from 'types/Visualizer';
import {simpleAnalyser} from 'services/audio';
import AmpShaderPlayer from './AmpShaderPlayer';
import presets from './presets';

const ampShaderPlayer = new AmpShaderPlayer(simpleAnalyser);

console.log('AmpShader presets:', presets.length);

const ampshader: VisualizerProvider<AmpShaderVisualizer> = {
    id: 'ampshader',
    name: 'ampshader',
    url: 'https://ampcast.app/',
    player: ampShaderPlayer,
    visualizers: presets,
    observeVisualizers: () => of(presets),
};

export default ampshader;