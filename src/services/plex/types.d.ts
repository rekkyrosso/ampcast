declare namespace plex {
    interface MediaContainer {
        readonly size: number;
        readonly totalSize: number;
        readonly offset: number;
        readonly identifier: string;
        readonly mediaTagPrefix: string;
        readonly mediaTagVersion: string;
    }

    interface MetadataContainer<T extends MediaObject = MediaObject> extends MediaContainer {
        readonly Metadata: readonly T[];
    }

    interface AccountResponse {
        readonly MyPlex: Account;
    }

    interface Account {
        readonly authToken: string;
    }

    interface MetadataResponse<T extends MediaObject = MediaObject> {
        readonly MediaContainer: MetadataContainer<T>;
    }

    interface DirectoryResponse {
        readonly MediaContainer: {
            readonly Directory: readonly Directory[];
        };
    }

    interface PlayQueueResponse {
        readonly MediaContainer: PlayQueue;
    }

    interface SearchResult<T extends RatingObject = RatingObject> {
        readonly Metadata: T;
        readonly score: number;
    }

    interface SearchResultResponse<T extends RatingObject = RatingObject> {
        readonly MediaContainer: {
            readonly SearchResult: readonly SearchResult<T>[];
        };
    }

    interface BaseRatingObject {
        readonly Genre?: readonly Tag[];
        readonly Guid?: readonly Guid[];
        readonly Country?: readonly Tag[];
        readonly addedAt: number; // Date
        readonly art: string;
        readonly attribution: string;
        readonly deletedAt: number; // Date
        readonly guid: string;
        readonly index: number;
        readonly key: string;
        readonly lastViewedAt: number; // Date
        readonly ratingKey: string;
        readonly userRating: number;
        readonly summary: string;
        readonly thumb: string;
        readonly title: string;
        readonly titleSort: string;
        readonly updatedAt: number; // Date
        readonly viewCount: number;
        readonly librarySectionTitle?: string;
        readonly rating?: number;
        readonly ratingCount?: number;
        readonly saved?: boolean;
        readonly userState?: boolean;
    }

    interface Artist extends BaseRatingObject {
        readonly type: 'artist';
    }

    interface Album extends BaseRatingObject {
        readonly type: 'album';
        readonly parentId: number;
        readonly mood: Tag[];
        readonly style: Tag[];
        readonly director: Tag[];
        readonly lastRatedAt: number; // Date
        readonly leafCount: number;
        readonly loudnessAnalysisVersion: string;
        readonly originallyAvailableAt: number; // Date
        readonly parentGuid: string;
        readonly parentKey: string;
        readonly parentRatingKey: string;
        readonly parentThumb: string;
        readonly parentTitle: string;
        readonly studio: string;
        readonly viewedLeafCount: number;
        readonly year: number;
    }

    interface Track extends BaseRatingObject {
        readonly type: 'track';
        readonly Media: Media[];
        readonly parentId: number;
        readonly grandparentId: number;
        readonly plexMix: unknown;
        readonly duration: number;
        readonly grandparentGuid: string;
        readonly grandparentKey: string;
        readonly grandparentRatingKey: string;
        readonly grandparentThumb: string;
        readonly grandparentTitle: string;
        readonly lastRatedAt: number; // Date
        readonly originalTitle: string;
        readonly parentGuid: string;
        readonly parentIndex: number;
        readonly parentKey: string;
        readonly parentRatingKey: string;
        readonly parentThumb: string;
        readonly parentTitle: string;
        readonly parentYear: number;
        readonly contentRating?: string;
        readonly year?: number;
    }

    interface MusicVideo extends BaseRatingObject {
        readonly type: 'clip';
        readonly subType: 'musicVideo';
        readonly extraType: number; // '4' - artist
        readonly Media: Media[];
        readonly duration: number;
        readonly grandparentRatingKey: string;
        readonly grandparentTitle: string;
        readonly contentRating?: string;
    }

    interface Playlist {
        readonly type: 'playlist';
        readonly addedAt: number; // Date (unix)
        readonly attribution: string;
        readonly composite: string;
        readonly duration: number;
        readonly guid: string;
        readonly icon: string;
        readonly key: string;
        readonly lastViewedAt: number; // Date (unix)
        readonly leafCount: number;
        readonly playlistType: string;
        readonly ratingKey: string;
        readonly smart: boolean;
        readonly summary: '';
        readonly thumb?: string;
        readonly title: string;
        readonly updatedAt: number; // Date (unix)
        readonly viewCount: number;
    }

    interface Radio {
        readonly type: 'playlist';
        readonly radio: '1';
        readonly composite: string;
        readonly duration: number;
        readonly guid: string;
        readonly icon: string;
        readonly key: string;
        readonly leafCount: number;
        readonly playlistType: string;
        readonly smart: boolean;
        readonly summary: '';
        readonly title: string;
    }

    type RatingObject = Track | MusicVideo | Album | Artist;
    type MediaObject = Track | MusicVideo | Album | Artist | Playlist;

    interface Media {
        readonly id: number;
        readonly Part: readonly Part[];
        readonly duration: number;
        readonly bitrate?: number;
        readonly audioChannels: string;
        readonly audioCodec: string;
        readonly videoCodec?: string;
        readonly videoResolution?: string;
        readonly audioProfile?: string;
        readonly aspectRatio?: number;
        readonly container: string;
        readonly optimizedForStreaming?: boolean;
    }

    interface Part {
        readonly id: number;
        readonly Stream: readonly Stream[];
        readonly key: string;
        readonly duration: number;
        readonly file: string;
        readonly size: number;
        readonly container: string;
    }

    interface Stream {
        readonly id: number;
        readonly albumGain: string;
        readonly albumPeak: string;
        readonly albumRange: string;
        readonly audioChannelLayout: string;
        readonly bitrate: number;
        readonly channels: number;
        readonly codec: string;
        readonly displayTitle: string;
        readonly extendedDisplayTitle: string;
        readonly gain: string;
        readonly index: number;
        readonly loudness: string;
        readonly lra: string;
        readonly peak: string;
        readonly samplingRate: number;
        readonly selected: boolean;
        readonly streamType: number;
    }

    interface Guid {
        readonly id: string;
    }

    interface Genre {
        readonly key: string;
        readonly title: string;
    }

    interface Tag {
        readonly id: number;
        readonly filter: string;
        readonly tag: string;
    }

    interface Folder {
        readonly key: string;
        readonly title: string;
    }

    interface Device {
        readonly id: number;
        readonly connections: readonly Connection[];
        readonly name: string;
        readonly product: string;
        readonly productVersion: string;
        readonly platform: string;
        readonly platformVersion: string;
        readonly device: string;
        readonly clientIdentifier: string;
        readonly createdAt: string; // ISO
        readonly lastSeenAt: string; // ISO
        readonly provides: string;
        readonly owned: boolean;
        readonly accessToken: string;
        readonly publicAddress: string;
        readonly httpsRequired: boolean;
        readonly publicAddressMatches: boolean;
        readonly presence: boolean;
    }

    interface Connection {
        readonly IPv6: boolean;
        readonly address: string;
        readonly local: boolean;
        readonly port: number;
        readonly protocol: string;
        readonly relay: boolean;
        readonly uri: string;
    }

    interface PlayQueue {
        readonly Metadata: readonly PlayQueueItem[];
        readonly identifier: string;
        readonly mediaTagPrefix: string;
        readonly mediaTagVersion: number;
        readonly playQueueID: number;
        readonly playQueueSelectedItemID: number;
        readonly playQueueSelectedItemOffset: number;
        readonly playQueueSelectedMetadataItemID: string;
        readonly playQueueShuffled: false;
        readonly playQueueSourceURI: string;
        readonly playQueueTotalCount: number;
        readonly playQueueVersion: number;
        readonly size: number;
    }

    interface PlayQueueItem extends Track {
        readonly playQueueItemID: number;
    }

    interface Directory {
        readonly Location: readonly Location[];
        readonly agent: string;
        readonly allowSync: boolean;
        readonly art: string;
        readonly composite: string;
        readonly content: boolean;
        readonly contentChangedAt: number; // Date (unix)
        readonly createdAt: number; // Date (unix)
        readonly directory: boolean;
        readonly filters: boolean;
        readonly hidden: 0;
        readonly key: string;
        readonly language: string;
        readonly refreshing: boolean;
        readonly scannedAt: number; // Date (unix)
        readonly scanner: string;
        readonly thumb: string;
        readonly title: string;
        readonly type: string;
        readonly updatedAt: number; // Date (unix)
        readonly uuid: string;
    }

    interface Location {
        readonly id: number;
        readonly path: string;
    }

    interface Pin {
        readonly id: number;
        readonly code: string;
        readonly expiresIn: number;
    }

    interface TokenResponse {
        readonly authToken: string | null;
        readonly clientIdentifier: string;
        readonly code: string;
        readonly createdAt: string;
        readonly expiresAt: string;
        readonly expiresIn: number;
        readonly id: string;
        readonly newRegistration: boolean | null;
        readonly product: string;
        readonly trusted: boolean;
    }

    interface Hub {
        readonly Metadata: readonly MediaObject[];
        readonly context: string;
        readonly hubIdentifier: string;
        readonly hubKey: string;
        readonly key: string;
        readonly more: boolean;
        readonly size: number;
        readonly style: string;
        readonly title: string;
        readonly type: string;
    }

    interface HubsResponse {
        readonly MediaContainer: {
            readonly Hub: readonly Hub[];
        };
        readonly allowSync: boolean;
        readonly identifier: string;
        readonly librarySectionID: number;
        readonly librarySectionTitle: string;
        readonly librarySectionUUID: string;
        readonly size: number;
    }
}
