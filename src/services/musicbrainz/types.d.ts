declare namespace MusicBrainz {
    interface Recording {
        id: string;
        title: string;
        length: number; // Ms
        'first-release-date': string; // YYY-MM-DD
        video: boolean;
        disambiguation: string; // version info (e.g. 'explicit', '12" release')
        isrcs?: string[];
    }

    interface Media {
        title: string;
        tracks?: Track[];
        'track-count': number;
        position: number;
    }

    interface Release {
        id: string;
        title: string;
        date?: string; // year
        media?: Media[];
    }

    interface Track {
        id: string;
        position: number;
        recording: Recording;
        number: string; // numeric
        length: number;
        title: string;
    }

    namespace isrc {
        interface Response {
            recordings: Recording[];
            isrc: string;
        }
    }
}
