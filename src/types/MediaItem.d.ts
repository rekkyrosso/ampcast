import BaseMediaObject from './BaseMediaObject';
import ItemType from './ItemType';
import LinearType from './LinearType';
import MediaType from './MediaType';
import PlaybackType from './PlaybackType';

export default interface MediaItem extends BaseMediaObject {
    readonly itemType: ItemType.Media;
    readonly mediaType: MediaType;
    readonly duration: number; // Seconds
    readonly playedAt: number; // unix
    // Everything below here should be optional.
    readonly linearType?: LinearType; // For radio streams
    readonly playbackType?: PlaybackType;
    readonly isExternalMedia?: boolean; // Not provided by the associated `MediaService` (described by `src`)
    readonly isLivePlayback?: boolean;
    readonly artists?: readonly string[];
    readonly albumArtist?: string;
    readonly album?: string;
    readonly disc?: number;
    readonly track?: number; // Album track number
    readonly position?: number; // Playlist position number
    readonly year?: number;
    readonly stationName?: string;
    readonly noScrobble?: boolean;
    readonly unplayable?: boolean;
    readonly copyright?: string;
    // For playback.
    readonly startTime?: number;
    readonly srcs?: readonly string[]; // Playable sources that can't be derived from `src`.
    readonly skippable?: boolean; // Some radios are skippable.
    // External IDs.
    readonly isrc?: string;
    readonly recording_mbid?: string;
    readonly recording_msid?: string; // ListenBrainz only
    readonly track_mbid?: string;
    readonly release_mbid?: string;
    readonly artist_mbids?: readonly string[];
    readonly caa_mbid?: string; // cover art archive
    // For files.
    readonly fileName?: string;
    readonly blob?: Blob;
    readonly blobUrl?: string;
    // ReplayGain.
    readonly albumGain?: number;
    readonly albumPeak?: number;
    readonly trackGain?: number;
    readonly trackPeak?: number;
    // Badges.
    readonly badge?: string;
    readonly bitRate?: number;
    readonly container?: string;
    readonly explicit?: boolean;
    readonly shareLink?: string;
    // For video.
    readonly aspectRatio?: number;
    // For YouTube videos (mainly).
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
    readonly links?: {
        readonly artists?: readonly string[];
        readonly albumArtist?: string;
        readonly album?: string;
    };
}
