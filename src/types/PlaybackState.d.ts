import PlaylistItem from './PlaylistItem';

export default interface PlaybackState {
    readonly currentItem: PlaylistItem | null;
    readonly currentTime: number;
    readonly startedAt: number;
    readonly endedAt: number;
    readonly duration: number;
    readonly paused: boolean;
}
