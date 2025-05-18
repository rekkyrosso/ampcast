declare namespace LastFm {
    type ThumbnailSize = 'small' | 'medium' | 'large' | 'extralarge' | 'mega';

    interface Thumbnail {
        readonly size: ThumbnailSize;
        readonly '#text': string;
    }

    interface Wiki {
        readonly content: string;
        readonly summary: string;
        readonly published: string; // date text (parsable)
    }

    interface PageInfo {
        readonly page: string; // numeric
        readonly perPage: string; // numeric
        readonly total: string; // numeric
        readonly totalPages: string; // numeric
    }

    interface UserInfo {
        readonly user: {
            readonly age: string;
            readonly album_count: string;
            readonly artist_count: string;
            readonly bootstrap: string; // '0'
            readonly country: string; // 'None'
            readonly gender: string; // 'n'
            readonly image: readonly Thumbnail[];
            readonly name: string;
            readonly playcount: string;
            readonly playlists: string; // count
            readonly realname: string;
            readonly registered: {
                // They really are this way round.
                readonly unixtime: string;
                readonly '#text': number;
            };
            readonly subscriber: string; // count?
            readonly track_count: string;
            readonly type: string; // 'user'
            readonly url: string;
        };
    }

    interface Artist {
        readonly image: readonly Thumbnail[];
        readonly mbid?: string;
        readonly name: string;
        readonly playcount?: string; // numeric
        readonly userplaycount?: number;
        readonly url: string;
        readonly loved?: '0' | '1';
    }

    interface Album {
        readonly artist: {
            readonly mbid?: string;
            readonly name: string;
            readonly url: string;
        };
        readonly image: readonly Thumbnail[];
        readonly mbid?: string;
        readonly name: string;
        readonly playcount?: string; // numeric
        readonly userplaycount?: number;
        readonly url: string;
        readonly wiki?: Wiki;
        readonly loved?: '0' | '1';
    }

    interface Track {
        readonly artist: {
            readonly mbid?: string;
            readonly name: string;
            readonly url: string;
        };
        readonly image: readonly Thumbnail[];
        readonly mbid?: string;
        readonly name: string;
        readonly playcount?: string; // numeric
        readonly userplaycount?: number;
        readonly listeners?: string; // numeric
        readonly duration?: string | number; // numeric
        readonly url: string;
        readonly date?: {
            readonly uts: string; // numeric
        };
        readonly album?: {
            readonly '#text': string;
            readonly mbid?: string;
        };
        readonly loved?: '0' | '1';
        readonly '@attr'?: {
            readonly rank?: string | number;
            readonly nowplaying?: string;
        };
    }

    type AlbumInfo = Omit<Album, 'loved'>;

    interface AlbumInfoResponse {
        readonly album: AlbumInfo;
    }

    interface TrackInfo extends Omit<Track, 'loved'> {
        readonly album?: {
            readonly artist: string;
            readonly title: string;
            readonly mbid?: string;
            readonly url: string;
            readonly image: readonly Thumbnail[];
        };
        readonly userloved?: '0' | '1';
        readonly wiki?: Wiki;
    }

    interface TrackInfoResponse {
        readonly track: TrackInfo;
    }

    interface AlbumSearch {
        readonly results: {
            readonly albummatches: {
                readonly album: readonly (Album & {artist: string})[];
            };
        };
    }

    interface TrackSearchResult {
        readonly artist: string;
        readonly image: readonly Thumbnail[];
        readonly mbid?: string;
        readonly name: string;
        readonly listeners?: string; // numeric
        readonly url: string;
    }

    interface TrackSearch {
        readonly results: {
            readonly trackmatches: {
                readonly track: readonly TrackSearchResult[];
            };
        };
    }

    type MediaObject = Artist | Album | Track;
}
