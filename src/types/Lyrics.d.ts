export default interface Lyrics {
    readonly plain: readonly string[];
    readonly synched?: readonly SynchedLyric[];
}

export interface SynchedLyric {
    readonly startTime: number; // seconds
    readonly endTime: number;
    readonly text: string;
}
