import {AmpShaderVisualizer} from 'types/Visualizer';
import AmpShaderPlayer from '../ampshader/AmpShaderPlayer';
import animatedBackground from './gradientFlow.frag';

export default class AnimatedBackgroundPlayer extends AmpShaderPlayer {
    private readonly visualizer: AmpShaderVisualizer = {
        providerId: 'ampshader',
        name: 'Gradient Flow by hahnzhu',
        shader: animatedBackground,
        externalUrl: 'https://www.shadertoy.com/view/wdyczG',
    };

    load(): void {
        super.load(this.visualizer);
    }
}
