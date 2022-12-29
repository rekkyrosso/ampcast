import {of} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {AudioMotionVisualizer} from 'types/Visualizer';
import {audioContext, observeAudioSourceNode} from 'services/audio';
import AudioMotionPlayer from './AudioMotionPlayer';
import visualizers from './visualizers';

const audiomotionPlayer = new AudioMotionPlayer(audioContext, observeAudioSourceNode());

const audiomotion: VisualizerProvider<AudioMotionVisualizer> = {
    id: 'audiomotion',
    name: 'audioMotion-analyzer',
    externalUrl: 'https://audiomotion.dev/',
    player: audiomotionPlayer,
    visualizers,
    observeVisualizers: () => of(visualizers),
};

export default audiomotion;
