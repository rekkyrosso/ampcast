declare namespace Navidrome {
    interface Genre {
        readonly id: string;
        readonly name: string;
    }

    interface Artist {
        readonly albumCount: number;
        readonly biography: string;
        readonly externalInfoUpdatedAt: string;
        readonly fullText: string;
        readonly genres: readonly Genre[];
        readonly id: string;
        readonly mbzArtistId: string;
        readonly name: string;
        readonly orderArtistName: string;
        readonly playCount: number;
        readonly playDate: string;
        readonly rating: number;
        readonly size: number;
        readonly songCount: number;
        readonly starred: boolean;
        readonly starredAt: string;
    }

    interface Album {
        readonly albumArtist: string;
        readonly albumArtistId: string;
        readonly allArtistIds: string;
        readonly artist: string;
        readonly artistId: string;
        readonly compilation: boolean;
        readonly createdAt: string;
        readonly duration: number;
        readonly embedArtPath: '';
        readonly externalInfoUpdatedAt: string;
        readonly fullText: string;
        readonly genre: string;
        readonly genres: readonly Genre[];
        readonly id: string;
        readonly mbzAlbumArtistId: string;
        readonly mbzAlbumId: string;
        readonly maxYear: number;
        readonly minYear: number;
        readonly name: string;
        readonly orderAlbumArtistName: string;
        readonly orderAlbumName: string;
        readonly paths: string;
        readonly playCount: number;
        readonly playDate: string;
        readonly rating: number;
        readonly size: number;
        readonly songCount: number;
        readonly starred: boolean;
        readonly starredAt: string;
        readonly updatedAt: string;
    }

    interface Song {
        readonly album: string;
        readonly albumArtist: string;
        readonly albumArtistId: string;
        readonly albumId: string;
        readonly artist: string;
        readonly artistId: string;
        readonly bitRate: number;
        readonly bookmarkPosition: number;
        readonly catalogNum: string;
        readonly channels: number;
        readonly compilation: boolean;
        readonly createdAt: string;
        readonly discNumber: number;
        readonly duration: number;
        readonly fullText: string;
        readonly genre: string;
        readonly genres: Genre[];
        readonly hasCoverArt: boolean;
        readonly id: string;
        readonly mediaFileId?: string;
        readonly mbzAlbumArtistId: string;
        readonly mbzAlbumId: string;
        readonly mbzArtistId: string;
        readonly mbzReleaseTrackId: string;
        readonly mbzTrackId: string;
        readonly missing: boolean;
        readonly orderAlbumArtistName: string;
        readonly orderAlbumName: string;
        readonly orderArtistName: string;
        readonly orderTitle: string;
        readonly path: string;
        readonly playCount: number;
        readonly playDate: string;
        readonly rating: 0;
        readonly rgAlbumGain: number;
        readonly rgAlbumPeak: number;
        readonly rgTrackGain: number;
        readonly rgTrackPeak: number;
        readonly size: number;
        readonly starred: boolean;
        readonly starredAt: string;
        readonly suffix: string;
        readonly title: string;
        readonly trackNumber: number;
        readonly updatedAt: string;
        readonly year: number;
        readonly tags?: {
            readonly asin: readonly string[];
            readonly barcode: readonly string[];
            readonly disctotal: string[];
            readonly genre: readonly string[];
            readonly isrc: readonly string[];
            readonly language: readonly string[];
            readonly media: readonly string[];
            readonly recordlabel: readonly string[];
            readonly releasecountry: readonly string[];
            readonly releasestatus: readonly string[];
            readonly releasetype: readonly string[];
            readonly script: readonly string[];
            readonly tracktotal: readonly string[];
        };
    }

    interface Playlist {
        readonly comment: string;
        readonly createdAt: string;
        readonly duration: number;
        readonly evaluatedAt: string;
        readonly id: string;
        readonly name: string;
        readonly ownerId: string;
        readonly ownerName: string;
        readonly path: string;
        readonly public: boolean;
        readonly rules: null;
        readonly size: number;
        readonly songCount: number;
        readonly sync: boolean;
        readonly updatedAt: string;
    }

    type MediaObject = Song | Album | Artist | Playlist;
}
