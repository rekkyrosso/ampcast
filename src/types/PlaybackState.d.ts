import PlaylistItem from './PlaylistItem';

export default interface PlaybackState {
    readonly currentItem: PlaylistItem | null;
    readonly currentTime: number;
    readonly startedAt: number; // Ms
    readonly endedAt: number; // Ms
    readonly duration: number;
    readonly paused: boolean;
    readonly playbackId: string;
    readonly miniPlayer: boolean; // State comes from miniPlayer.
}
