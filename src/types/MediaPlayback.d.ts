import {SetRequired} from 'type-fest';
import Player from './Player';
import PlaylistItem from './PlaylistItem';

export default interface MediaPlayback extends SetRequired<
    Player<PlaylistItem | null>,
    'skipNext' | 'skipPrev'
> {
    stopAfterCurrent: boolean;
    eject(): void;
    loadAndPlay(item: PlaylistItem): void;
    next(): void;
    prev(): void;
}
