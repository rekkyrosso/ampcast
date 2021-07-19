import Genre from './Genre';
import Rating from './Rating';

export default interface PlayableItem {
    readonly src: string;
    readonly title: string;
    readonly duration: number;
    readonly artist?: string;
    readonly album?: string;
    readonly albumArtist?: string;
    readonly genre?: Genre;
    readonly rating?: Rating;
    readonly disc?: number;
    readonly track?: number;
    readonly bpm?: number;
    readonly year?: number;
    readonly playCount?: number;
    readonly lastPlayed?: number;
}
