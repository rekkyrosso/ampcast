declare namespace Subsonic {
    interface Artist {
        readonly albumCount: number;
        readonly coverArt: string;
        readonly id: string;
        readonly name: string;
        readonly starred?: string;
        readonly album?: Album[];
        // OpenSubsonic extensions
        readonly musicBrainzId?: string;
    }

    interface SimilarArtist {
        readonly id: string;
        readonly name: string;
    }

    interface ArtistInfo {
        readonly biography?: string;
        readonly musicBrainzId?: string;
        readonly lastFmUrl?: string;
        readonly smallImageUrl?: string;
        readonly mediumImageUrl?: string;
        readonly largeImageUrl?: string;
        readonly similarArtist?: SimilarArtist[];
    }

    interface Album {
        readonly artist: string;
        readonly artistId: string;
        readonly coverArt: string;
        readonly created: string;
        readonly duration: number;
        readonly genre?: string;
        readonly id: string;
        readonly isDir?: true; // `true` if the result is not based on ID3 tags. Missing otherwise.
        readonly name: string;
        readonly playCount: number;
        readonly songCount: number;
        readonly starred?: string;
        readonly year?: number;
        readonly song?: Song[];
        // OpenSubsonic extensions
        readonly musicBrainzId?: string;
    }

    interface AlbumInfo {
        readonly notes?: string;
        readonly musicBrainzId?: string;
        readonly lastFmUrl?: string;
        readonly smallImageUrl?: string;
        readonly mediumImageUrl?: string;
        readonly largeImageUrl?: string;
    }

    interface Song {
        readonly album: string;
        readonly albumId: string;
        readonly artist: string;
        readonly artistId: string;
        readonly bitRate: number;
        readonly contentType: string;
        readonly coverArt: string;
        readonly created: string;
        readonly discNumber?: number;
        readonly duration: number;
        readonly genre?: string;
        readonly id: string;
        readonly isDir: boolean;
        readonly isVideo?: false;
        readonly parent: string;
        readonly path: string;
        readonly playCount: number;
        readonly size: number;
        readonly starred?: string;
        readonly suffix: string;
        readonly title: string;
        readonly track: number;
        readonly type: 'music';
        readonly year?: number;
        // OpenSubsonic extensions
        readonly musicBrainzId?: string;
        readonly replayGain?: {
            readonly albumGain: number;
            readonly trackGain: number;
        };
    }

    interface Video {
        readonly album: string;
        readonly bitRate: number;
        readonly contentType: string;
        readonly created: string;
        readonly duration: number;
        readonly id: string;
        readonly isDir: boolean;
        readonly isVideo: true;
        readonly originalHeight: number;
        readonly originalWidth: number;
        readonly parent: string;
        readonly path: string;
        readonly playCount: number;
        readonly size: number;
        readonly starred?: string;
        readonly suffix: string;
        readonly title: string;
        readonly type: 'video';
    }

    interface Radio {
        readonly id: string;
        readonly name: string;
        readonly homePageUrl?: string;
        readonly homepageUrl?: string; // Gonic
        readonly streamUrl: string;
    }

    interface Playlist {
        readonly changed: string;
        readonly comment: string;
        readonly coverArt: string;
        readonly created: string;
        readonly duration: number;
        readonly id: string;
        readonly name: string;
        readonly owner: string;
        readonly public: boolean;
        readonly songCount: number;
        readonly entry?: MediaItem[];
    }

    interface Genre {
        readonly songCount: number;
        readonly albumCount: number;
        readonly value: string;
    }

    interface MusicFolder {
        readonly id: string;
        readonly name: string;
    }

    interface Index {
        readonly name: string;
        readonly artist: MusicFolder[];
        readonly child: MediaItem[];
    }

    interface Directory {
        readonly id: string;
        readonly parent: string;
        readonly isDir: true;
        readonly title: string;
        readonly name: string;
        readonly playCount: number;
        readonly created: string;
        readonly starred?: string;
        readonly child: DirectoryItem[];
    }

    type MediaItem = Song | Video;
    type DirectoryItem = Directory | MediaItem;
    type MediaObject = Album | Artist | Playlist | DirectoryItem | Radio;

    interface ScrobbleParams {
        readonly id: string;
        readonly time?: number;
        readonly submission?: boolean;
    }

    interface CreatePlaylistResponse {
        readonly playlist?: Playlist;
    }

    interface Shares {
        readonly share: Share[];
    }

    interface Share {
        readonly url: string;
    }

    interface PingResponse {
        readonly version: string;
        readonly openSubsonic?: boolean;
        readonly serverVersion?: string;
        readonly type?: string;
    }
}
