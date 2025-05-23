import BaseMediaObject from './BaseMediaObject';
import ItemType from './ItemType';
import LinearType from './LinearType';
import MediaType from './MediaType';
import PlaybackType from './PlaybackType';

export default interface MediaItem extends BaseMediaObject {
    readonly itemType: ItemType.Media;
    readonly mediaType: MediaType;
    readonly duration: number; // Seconds
    readonly playedAt: number; // UTC
    // Everything below here should be optional.
    readonly linearType?: LinearType; // For radio streams
    readonly playbackType?: PlaybackType;
    readonly isExternalMedia?: boolean; // Not provided by the associated `MediaService` (described by `src`)
    readonly isLivePlayback?: boolean;
    readonly artists?: readonly string[];
    readonly albumArtist?: string;
    readonly album?: string;
    readonly disc?: number;
    readonly track?: number;
    readonly year?: number;
    readonly unplayable?: boolean;
    readonly noScrobble?: boolean;
    readonly isrc?: string;
    readonly recording_mbid?: string;
    readonly recording_msid?: string; // ListenBrainz only
    readonly track_mbid?: string;
    readonly release_mbid?: string;
    readonly artist_mbids?: readonly string[];
    readonly caa_mbid?: string; // cover art archive
    readonly fileName?: string;
    readonly stationName?: string;
    readonly blob?: Blob;
    readonly blobUrl?: string;
    readonly startTime?: number;
    readonly albumGain?: number;
    readonly albumPeak?: number;
    readonly trackGain?: number;
    readonly trackPeak?: number;
    readonly bitRate?: number;
    readonly copyright?: string;
    readonly explicit?: boolean;
    readonly badge?: string;
    readonly container?: string;
    readonly shareLink?: string;
    readonly skippable?: boolean;
    // Playable sources that can't be derived from `src`.
    // Currently used by TIDAL(via Plex) audio quality sources.
    readonly srcs?: readonly string[];
    // For video.
    readonly aspectRatio?: number;
    // For YouTube videos mainly.
    readonly owner?: {
        readonly name: string;
        readonly url?: string;
    };
    // For last.fm/ListenBrainz: (partial) link to original source (if any).
    readonly link?: {
        readonly src: string;
        readonly srcs?: readonly string[];
        readonly externalUrl?: string;
    };
    readonly plex?: {
        readonly playQueueItemID?: number;
    };
}
