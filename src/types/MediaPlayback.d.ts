import {Except, SetRequired} from 'type-fest';
import Player from './Player';
import PlaylistItem from './PlaylistItem';
import RepeatMode from './RepeatMode';

export default interface MediaPlayback extends SetRequired<
    Except<Player<PlaylistItem | null>, 'loop'>,
    'skipNext' | 'skipPrev'
> {
    repeatMode: RepeatMode;
    stopAfterCurrent: boolean;
    eject(): void;
    loadAndPlay(item: PlaylistItem): void;
    next(): void;
    prev(): void;
}
