import BaseMediaObject from './BaseMediaObject';
import ItemType from './ItemType';
import MediaType from './MediaType';
import PlaybackType from './PlaybackType';

export default interface MediaItem extends BaseMediaObject {
    readonly itemType: ItemType.Media;
    readonly mediaType: MediaType;
    readonly duration: number; // Seconds
    readonly playedAt: number; // UTC
    // Everything below here should be optional.
    readonly playbackType?: PlaybackType;
    readonly artists?: readonly string[];
    readonly albumArtist?: string;
    readonly album?: string;
    readonly disc?: number;
    readonly track?: number;
    readonly year?: number;
    readonly aspectRatio?: number;
    readonly unplayable?: boolean;
    readonly noScrobble?: boolean;
    readonly isrc?: string;
    readonly recording_mbid?: string;
    readonly recording_msid?: string; // ListenBrainz only
    readonly track_mbid?: string;
    readonly release_mbid?: string;
    readonly artist_mbids?: readonly string[];
    readonly fileName?: string;
    readonly blob?: Blob;
    readonly blobUrl?: string;
    readonly startTime?: number;
    // Playable sources that can't be derived from `src`.
    // Currently used by TIDAL(via Plex) audio quality sources.
    readonly srcs?: string[];
    // For YouTube videos mainly.
    readonly owner?: {
        readonly name: string;
        readonly url?: string;
    };
    // For last.fm/ListenBrainz: (partial) link to original source (if any).
    readonly link?: {
        readonly src: string;
        readonly externalUrl?: string;
    };
    readonly musicBrainz?: {
        readonly status: string;
        readonly country: string;
        readonly format: string;
    };
}
