import BaseMediaObject from './BaseMediaObject';
import ItemType from './ItemType';
import MediaType from './MediaType';
import PlaybackType from './PlaybackType';

export default interface MediaItem extends BaseMediaObject {
    readonly itemType: ItemType.Media;
    readonly mediaType: MediaType;
    readonly playbackType?: PlaybackType;
    readonly duration: number;
    readonly playedAt: number; // UTC
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
    // Playable sources that can be derived from `src`.
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
