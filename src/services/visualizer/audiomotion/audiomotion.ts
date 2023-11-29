import {of} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {AudioMotionVisualizer} from 'types/Visualizer';
import AudioMotionPlayer from './AudioMotionPlayer';
import visualizers from './visualizers';

const audiomotion: VisualizerProvider<AudioMotionVisualizer> = {
    id: 'audiomotion',
    name: 'audioMotion-analyzer',
    externalUrl: 'https://audiomotion.dev/',
    visualizers,
    observeVisualizers: () => of(visualizers),
    createPlayer(audio) {
        if (!this.player) {
            (this as any).player = new AudioMotionPlayer(audio);
        }
        return this.player!;
    },
};

export default audiomotion;
