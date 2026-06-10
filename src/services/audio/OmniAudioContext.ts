import OmniAnalyserNode from './OmniAnalyserNode';

export default class OmniAudioContext extends AudioContext {
    constructor() {
        super({latencyHint: 'playback'});
    }

    createAnalyser(): AnalyserNode {
        return new OmniAnalyserNode(this);
    }
}
