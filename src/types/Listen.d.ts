import MediaItem from './MediaItem';

export interface ListenData {
    readonly sessionId: string;
    readonly lastfmScrobbledAt: number;
    readonly listenbrainzScrobbledAt: number;
}

type Listen = MediaItem & ListenData;

export default Listen;
