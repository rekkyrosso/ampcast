import {of} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {AudioMotionVisualizer} from 'types/Visualizer';
import {audioContext, observeAudioSourceNode} from 'services/audio';
import AudioMotionPlayer from './AudioMotionPlayer';
import presets from './presets';

console.log('AudioMotion presets:', presets.length);

const audiomotionPlayer = new AudioMotionPlayer(audioContext, observeAudioSourceNode());

const audiomotion: VisualizerProvider<AudioMotionVisualizer> = {
    id: 'audiomotion',
    name: 'audioMotion-analyzer',
    url: 'https://audiomotion.dev/',
    player: audiomotionPlayer,
    visualizers: presets,
    observeVisualizers: () => of(presets),
};

export default audiomotion;
