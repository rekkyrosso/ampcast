import MediaItem from './MediaItem';

export interface ListenData {
    readonly sessionId: string;
    readonly endedAt: number; // unix
    readonly lastfmScrobbledAt: number; // unix
    readonly listenbrainzScrobbledAt: number; // unix
}

type Listen = MediaItem & ListenData;

export default Listen;
