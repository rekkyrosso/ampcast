declare namespace LastFm {
    type ThumbnailSize = 'small' | 'medium' | 'large';

    interface Thumbnail {
        size: ThumbnailSize;
        #text: string;
    }

    namespace User {
        interface Info {
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
                    #text: number;
                };
                subscriber: string; // count?
                track_count: string;
                type: string; // 'user'
                url: string;
            };
        }
    }
}
