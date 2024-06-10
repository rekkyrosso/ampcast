declare namespace Subsonic {
    interface Artist {
        albumCount: number;
        coverArt: string;
        id: string;
        name: string;
        starred?: string;
        album?: Album[];
    }

    interface SimilarArtist {
        id: string;
        name: string;
    }

    interface ArtistInfo {
        biography?: string;
        musicBrainzId?: string;
        lastFmUrl?: string;
        smallImageUrl?: string;
        mediumImageUrl?: string;
        largeImageUrl?: string;
        similarArtist?: SimilarArtist[];
    }

    interface Album {
        artist: string;
        artistId: string;
        coverArt: string;
        created: string;
        duration: number;
        genre?: string;
        id: string;
        isDir?: true; // `true` if the result is not based on ID3 tags. Missing otherwise.
        name: string;
        playCount: number;
        songCount: number;
        starred?: string;
        year?: number;
        song?: Song[];
    }

    interface AlbumInfo {
        notes?: string;
        musicBrainzId?: string;
        lastFmUrl?: string;
        smallImageUrl?: string;
        mediumImageUrl?: string;
        largeImageUrl?: string;
    }

    interface Song {
        album: string;
        albumId: string;
        artist: string;
        artistId: string;
        bitRate: number;
        contentType: string;
        coverArt: string;
        created: string;
        discNumber?: number;
        duration: number;
        genre?: string;
        id: string;
        isDir: boolean;
        isVideo?: false;
        parent: string;
        path: string;
        playCount: number;
        size: number;
        starred?: string;
        suffix: string;
        title: string;
        track: number;
        type: 'music';
        year?: number;
    }

    interface Video {
        album: string;
        bitRate: number;
        contentType: string;
        created: string;
        duration: number;
        id: string;
        isDir: boolean;
        isVideo: true;
        originalHeight: number;
        originalWidth: number;
        parent: string;
        path: string;
        playCount: number;
        size: number;
        starred?: string;
        suffix: string;
        title: string;
        type: 'video';
    }

    interface Playlist {
        changed: string;
        comment: string;
        coverArt: string;
        created: string;
        duration: number;
        id: string;
        name: string;
        owner: string;
        public: true;
        songCount: number;
        entry?: MediaItem[];
    }

    interface Genre {
        songCount: number;
        albumCount: number;
        value: string;
    }

    interface MusicFolder {
        id: string;
        name: string;
    }

    interface Index {
        name: string;
        artist: MusicFolder[];
        child: MediaItem[];
    }

    interface Directory {
        id: string;
        parent: string;
        isDir: true;
        title: string;
        name: string;
        playCount: number;
        created: string;
        starred?: string;
        child: DirectoryItem[];
    }

    type MediaItem = Song | Video;
    type DirectoryItem = Directory | MediaItem;
    type MediaObject = Album | Artist | Playlist | DirectoryItem;

    interface ScrobbleParams {
        id: string;
        time?: number;
        submission?: boolean;
    }

    interface CreatePlaylistResponse {
        playlist?: Playlist;
    }
}
