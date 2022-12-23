import {of} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {WaveformVisualizer} from 'types/Visualizer';
import {simpleAnalyser} from 'services/audio';
import WaveformPlayer from './WaveformPlayer';
import presets from './presets';

const waveformPlayer = new WaveformPlayer(simpleAnalyser);

const waveform: VisualizerProvider<WaveformVisualizer> = {
    id: 'waveform',
    name: 'Waveform',
    player: waveformPlayer,
    visualizers: presets,
    observeVisualizers: () => of(presets),
};

export default waveform;
