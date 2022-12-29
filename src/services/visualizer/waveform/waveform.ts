import {of} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {WaveformVisualizer} from 'types/Visualizer';
import {simpleAnalyser} from 'services/audio';
import WaveformPlayer from './WaveformPlayer';
import visualizers from './visualizers';

const waveformPlayer = new WaveformPlayer(simpleAnalyser);

const waveform: VisualizerProvider<WaveformVisualizer> = {
    id: 'waveform',
    name: 'Waveform',
    externalUrl: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API',
    player: waveformPlayer,
    visualizers,
    observeVisualizers: () => of(visualizers),
};

export default waveform;
