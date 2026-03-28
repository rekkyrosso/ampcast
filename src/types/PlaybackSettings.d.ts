import RepeatMode from './RepeatMode';

export default interface PlaybackSettings {
    repeatMode: RepeatMode;
    muted: boolean;
    volume: number;
}
