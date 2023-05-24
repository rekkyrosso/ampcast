import OmniAnalyserNode from './OmniAnalyserNode';

export default class OmniAudioContext extends AudioContext {
    createAnalyser(options?: AnalyserOptions): AnalyserNode {
        return new OmniAnalyserNode(this, options);
    }
}
