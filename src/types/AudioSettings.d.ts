import ReplayGainMode from './ReplayGainMode';

export default interface AudioSettings {
    replayGainMode: ReplayGainMode;
    replayGainPreAmp: number;
    useSystemAudio: boolean;
}
