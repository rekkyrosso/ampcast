export default interface AudioManager {
    readonly context: AudioContext;
    readonly source: AudioNode;
    readonly streamingSupported: boolean;
    volume: number;
}
