declare namespace plex {
    interface MediaContainer {
        readonly size: number;
        readonly totalSize: number;
        readonly offset: number;
        readonly identifier: string;
        readonly mediaTagPrefix: string;
        readonly mediaTagVersion: string;
    }

    interface MetadataContainer<T = MediaObject> extends MediaContainer {
        readonly Metadata: readonly T[];
    }

    interface AccountResponse {
        readonly MyPlex: Account;
    }

    interface Account {
        readonly authToken: string;
    }

    interface MetadataResponse<T = MediaObject> {
        readonly MediaContainer: MetadataContainer<T>;
    }

    interface DirectoryContainer extends MediaContainer {
        readonly Directory: readonly Directory[];
    }

    interface DirectoryResponse {
        readonly MediaContainer: DirectoryContainer;
    }

    interface PlayQueueResponse {
        readonly MediaContainer: PlayQueue;
    }

    interface SearchResult {
        readonly Metadata: Metadata;
        readonly score: number;
    }

    interface SearchResultContainer extends MediaContainer {
        readonly SearchResult: readonly SearchResult[];
    }

    interface SearchResultsContainer extends MediaContainer {
        readonly SearchResults: readonly SearchResultContainer[];
    }

    interface SearchResultsResponse {
        readonly MediaContainer: SearchResultsContainer;
    }

    interface SearchResultResponse {
        readonly MediaContainer: SearchResultContainer;
    }

    interface MusicObject {
        readonly Genre: readonly Tag[];
        readonly Country: readonly Tag[];
        // readonly popularTracks: readonly Track[];
        readonly addedAt: number; // Date
        readonly art: string;
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
        readonly type: 'artist' | 'album' | 'track' | 'clip';
        readonly updatedAt: number; // Date
        readonly viewCount: number;
        readonly userState?: boolean;
        readonly rating?: number;
        readonly saved?: boolean;
    }

    interface Artist extends MusicObject {
        readonly type: 'artist';
    }

    interface Album extends MusicObject {
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

    interface Track extends MusicObject {
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
        readonly ratingCount: number;
        readonly ratingKey: string;
        readonly year?: number;
    }

    interface MusicVideo extends MusicObject {
        readonly type: 'clip';
        readonly subType: 'musicVideo';
        readonly extraType: number; // '4' - artist
        readonly Media: Media[];
        readonly duration: number;
        readonly grandparentTitle: string;
    }

    type MediaObject = Track | MusicVideo | Album | Artist | Playlist;

    interface Media {
        readonly id: number;
        readonly Part: readonly Part[];
        readonly duration: number;
        readonly bitrate?: number;
        readonly audioChannels: string;
        readonly audioCodec: string;
        readonly audioProfile?: string;
        readonly container: string;
        readonly optimizedForStreaming?: boolean;
    }

    interface Part {
        readonly id: number;
        readonly key: string;
        readonly duration: number;
        readonly file: string;
        readonly size: number;
        readonly container: string;
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
        readonly Metadata: any;
        readonly identifier: string;
        readonly mediaTagPrefix: string;
        readonly mediaTagVersion: number;
        readonly playQueueID: number;
        readonly playQueueSelectedItemID: string | number;
        readonly playQueueSelectedItemOffset: number;
        readonly playQueueSelectedMetadataItemID: string;
        readonly playQueueShuffled: false;
        readonly playQueueSourceURI: string;
        readonly playQueueTotalCount: number;
        readonly playQueueVersion: number;
        readonly size: number;
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

    interface Playlist {
        readonly type: 'playlist';
        readonly addedAt: number; // Date (unix)
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

    interface Pin {
        readonly id: number;
        readonly code: string;
        readonly expiresIn: number;
    }

    interface TokenResponse {
        authToken: string | null;
        clientIdentifier: string;
        code: string;
        createdAt: string;
        expiresAt: string;
        expiresIn: number;
        id: string;
        newRegistration: boolean | null;
        product: string;
        trusted: boolean;
    }
}
