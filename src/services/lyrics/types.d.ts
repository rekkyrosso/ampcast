namespace LRCLIB {
    interface Lyrics {
        readonly id: number;
        readonly trackName: string;
        readonly artistName: string;
        readonly albumName: string;
        readonly duration: number;
        readonly instrumental: false;
        readonly plainLyrics: string;
        readonly syncedLyrics: string | null;
    }
}
