export default interface Lyrics {
    readonly plain: readonly string[];
    readonly synced?: readonly SyncedLyric[];
}

export interface SyncedLyric {
    readonly startTime: number; // seconds
    readonly endTime: number;
    readonly text: string;
}
