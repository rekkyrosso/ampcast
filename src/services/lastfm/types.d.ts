declare namespace LastFm {
    type ThumbnailSize = 'small' | 'medium' | 'large' | 'extralarge' | 'mega';

    interface Thumbnail {
        size: ThumbnailSize;
        '#text': string;
    }

    interface PageInfo {
        page: string; // numeric
        perPage: string; // numeric
        total: string; // numeric
        totalPages: string; // numeric
    }

    interface UserInfo {
        user: {
            age: string;
            album_count: string;
            artist_count: string;
            bootstrap: string; // '0'
            country: string; // 'None'
            gender: string; // 'n'
            image: readonly Thumbnail[];
            name: string;
            playcount: string;
            playlists: string; // count
            realname: string;
            registered: {
                // They really are this way round.
                unixtime: string;
                '#text': number;
            };
            subscriber: string; // count?
            track_count: string;
            type: string; // 'user'
            url: string;
        };
    }

    interface Artist {
        image: readonly Thumbnail[];
        mbid?: string;
        name: string;
        playcount?: string; // numeric
        userplaycount?: number;
        url: string;
        loved?: '0' | '1';
    }

    interface Album {
        artist: {
            mbid?: string;
            name: string;
            url: string;
        };
        image: readonly Thumbnail[];
        mbid?: string;
        name: string;
        playcount?: string; // numeric
        userplaycount?: number;
        url: string;
        wiki?: {
            content: string;
            summary: string;
            published: string; // date text (parsable)
        };
        loved?: '0' | '1';
    }

    interface Track {
        artist: {
            mbid?: string;
            name: string;
            url: string;
        };
        image: readonly Thumbnail[];
        mbid?: string;
        name: string;
        playcount?: string; // numeric
        userplaycount?: number;
        listeners?: string; // numeric
        duration?: string | number; // numeric
        url: string;
        date?: {
            uts: string; // numeric
        };
        album?: {
            '#text': string;
            mbid?: string;
        };
        loved?: '0' | '1';
        '@attr'?: {
            rank?: string | number;
        }
    }

    type MediaObject = Artist | Album | Track;
}
