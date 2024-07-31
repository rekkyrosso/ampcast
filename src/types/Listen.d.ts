import MediaItem from './MediaItem';

export default interface Listen extends MediaItem {
    readonly sessionId: string;
    readonly lastfmScrobbledAt: number;
    readonly listenbrainzScrobbledAt: number;
}
