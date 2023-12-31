declare namespace MusicBrainz {
    interface Artist {
        readonly id: string;
        readonly name: string;
        readonly type: string;
    }

    interface Release {
        readonly id: string;
        readonly title: string;
        readonly date?: string; // year
        readonly media?: readonly Media[];
        readonly 'artist-credit'?: readonly ArtistCredit[];
        readonly 'release-group': ReleaseGroup;
        readonly country: string;
        readonly status: string;
    }

    interface ReleaseGroup {
        readonly id: string;
        readonly title: string;
        readonly 'primary-type': string;
        readonly 'secondary-types': readonly string[];
    }

    interface Media {
        readonly title: string;
        readonly 'track-count': number;
        readonly position: number;
        readonly format: string;
        // TODO: Annoying ambiguity
        readonly tracks?: Track[];
        readonly track?: Track[];
    }

    interface Track {
        readonly id: string;
        readonly position: number;
        readonly recording?: Recording;
        readonly number: string;
        readonly length: number; // ms
        readonly title: string;
    }

    interface Recording {
        readonly id: string;
        readonly title: string;
        readonly length: number; // Ms
        readonly 'first-release-date': string; // YYY-MM-DD
        readonly video: boolean;
        readonly disambiguation: string; // version info (e.g. 'explicit', '12" release')
        readonly 'artist-credit'?: readonly ArtistCredit[];
        readonly releases?: readonly Release[];
        readonly isrcs?: readonly string[];
    }

    interface ArtistCredit {
        readonly artist: Artist;
        readonly name: string;
    }

    interface RecordingsQuery {
        readonly count: number;
        readonly recordings: readonly Recording[];
    }

    interface RecordingsByISRC extends RecordingsQuery {
        readonly isrc: string;
    }
}

declare namespace coverart {
    interface Image {
        readonly approved: boolean;
        readonly back: boolean;
        readonly front: boolean;
        readonly id: number;
        readonly thumbnails: Record<string, string>;
    }

    interface Response {
        readonly images: readonly Image[];
        readonly release: string;
    }
}
