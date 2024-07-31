import Player from './Player';
import PlaylistItem from './PlaylistItem';

export default interface MediaPlayback extends Player<PlaylistItem | null> {
    stopAfterCurrent: boolean;
    eject(): void;
    loadAndPlay(item: PlaylistItem): void;
    next(): void;
    prev(): void;
}
