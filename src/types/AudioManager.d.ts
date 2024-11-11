export default interface AudioManager {
    readonly context: AudioContext;
    readonly replayGain: number;
    readonly source: AudioNode;
    readonly streamingSupported: boolean;
    volume: number;
}
