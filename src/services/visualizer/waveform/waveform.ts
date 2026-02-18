import {of} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {WaveformVisualizer} from 'types/Visualizer';
import WaveformPlayer from './WaveformPlayer';
import visualizers from './visualizers';

const waveform: VisualizerProvider<WaveformVisualizer> = {
    id: 'waveform',
    name: 'Waveform',
    externalUrl:
        'https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API',
    visualizers,
    observeVisualizers: () => of(visualizers),
    createPlayer(audio) {
        if (!this.player) {
            (this as any).player = new WaveformPlayer(audio, 'visualizer-waveform');
        }
        return this.player!;
    },
};

export default waveform;
