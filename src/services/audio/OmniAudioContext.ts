import OmniAnalyserNode from './OmniAnalyserNode';

export default class OmniAudioContext extends AudioContext {
    createAnalyser(): AnalyserNode {
        return new OmniAnalyserNode(this);
    }
}
