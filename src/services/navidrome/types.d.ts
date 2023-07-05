declare namespace Navidrome {
    interface Genre {
        id: string;
        name: string;
    }

    interface Artist {
        albumCount: number;
        biography: string;
        externalInfoUpdatedAt: string;
        fullText: string;
        genres: Genre[];
        id: string;
        mbzArtistId: string;
        name: string;
        orderArtistName: string;
        playCount: number;
        playDate: string;
        rating: number;
        size: number;
        songCount: number;
        starred: boolean;
        starredAt: string;
    }

    interface Album {
        albumArtist: string;
        albumArtistId: string;
        allArtistIds: string;
        artist: string;
        artistId: string;
        compilation: boolean;
        createdAt: string;
        duration: number;
        embedArtPath: '';
        externalInfoUpdatedAt: string;
        fullText: string;
        genre: string;
        genres: Genre[];
        id: string;
        mbzAlbumArtistId: string;
        mbzAlbumId: string;
        maxYear: number;
        minYear: number;
        name: string;
        orderAlbumArtistName: string;
        orderAlbumName: string;
        paths: string;
        playCount: number;
        playDate: string;
        rating: number;
        size: number;
        songCount: number;
        starred: boolean;
        starredAt: string;
        updatedAt: string;
    }

    interface Song {
        album: string;
        albumArtist: string;
        albumArtistId: string;
        albumId: string;
        artist: string;
        artistId: string;
        bitRate: number;
        bookmarkPosition: number;
        catalogNum: string;
        channels: number;
        compilation: boolean;
        createdAt: string;
        discNumber: number;
        duration: number;
        fullText: string;
        genre: string;
        genres: Genre[];
        hasCoverArt: boolean;
        id: string;
        mediaFileId?: string;
        mbzAlbumArtistId: string;
        mbzAlbumId: string;
        mbzArtistId: string;
        mbzReleaseTrackId: string;
        mbzTrackId: string;
        orderAlbumArtistName: string;
        orderAlbumName: string;
        orderArtistName: string;
        orderTitle: string;
        path: string;
        playCount: number;
        playDate: string;
        rating: 0;
        rgAlbumGain: number;
        rgAlbumPeak: number;
        rgTrackGain: number;
        rgTrackPeak: number;
        size: number;
        starred: boolean;
        starredAt: string;
        suffix: string;
        title: string;
        trackNumber: number;
        updatedAt: string;
        year: number;
    }

    interface Playlist {
        comment: string;
        createdAt: string;
        duration: number;
        evaluatedAt: string;
        id: string;
        name: string;
        ownerId: string;
        ownerName: string;
        path: string;
        public: boolean;
        rules: null;
        size: number;
        songCount: number;
        sync: boolean;
        updatedAt: string;
    }

    type RateableObject = Song | Album | Artist;
    type MediaObject = RateableObject | Playlist;
}
