import PlaylistItem from './PlaylistItem';

export default interface NowPlaying {
    readonly stationId: string;
    readonly item: PlaylistItem | null;
    readonly startedAt: number;
    readonly endsAt?: number;
}
