import MediaItem from './MediaItem';

export default interface Listen extends MediaItem {
    readonly lastfmScrobbledAt: number;
    readonly listenbrainzScrobbledAt: number;
}
