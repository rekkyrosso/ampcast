import VisualizerProvider from 'types/VisualizerProvider';
import {AmpShaderVisualizer} from 'types/Visualizer';
import AmpShaderPlayer from './AmpShaderPlayer';
import {getVisualizers, observeVisualizers} from './visualizers';

const ampshader: VisualizerProvider<AmpShaderVisualizer> = {
    id: 'ampshader',
    name: 'ampshader',
    get visualizers() {
        return getVisualizers();
    },
    observeVisualizers,
    createPlayer(audio) {
        if (!this.player) {
            (this as any).player = new AmpShaderPlayer(audio, 'main');
        }
        return this.player!;
    },
};

export default ampshader;
