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
    readonly recording_mbid?: string; // MusicBrainz ID
    readonly recording_msid?: string; // MusicBrainz ID
    readonly release_mbid?: string;
    readonly artist_mbids?: string[];
    readonly fileName?: string;
    readonly link?: {
        readonly src: string;
        readonly externalUrl?: string;
    };
    readonly blob?: Blob;
    readonly srcs?: string[];
}
