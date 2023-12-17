import AudioManager from 'types/AudioManager';
import {AmpShaderVisualizer} from 'types/Visualizer';
import AmpShaderPlayer from '../ampshader/AmpShaderPlayer';
import animatedBackground from './animatedBackground.frag';

export default class AnimatedBackgroundPlayer extends AmpShaderPlayer {
    private readonly visualizer: AmpShaderVisualizer = {
        providerId: 'ampshader',
        name: 'Foamy water by k_mouse',
        shader: animatedBackground,
        externalUrl: 'https://www.shadertoy.com/view/llcXW7',
    };

    constructor(audio: AudioManager) {
        super(audio, 'animated-background');
    }

    load(): void {
        super.load(this.visualizer);
    }
}
