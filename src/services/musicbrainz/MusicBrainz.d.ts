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

    namespace isrc {
        interface Response {
            recordings: Recording[];
            isrc: string;
        }
    }
}
