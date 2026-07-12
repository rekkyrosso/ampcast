import type {IconName} from 'components/Icon';

export default interface Lyrics {
    readonly plain: readonly string[];
    readonly synced?: readonly SyncedLyric[];
    readonly provider?: LyricsProvider;
}

export interface LyricsProvider {
    readonly name: string;
    readonly icon?: IconName;
    readonly url?: string;
}

export interface SyncedLyric {
    readonly startTime: number; // seconds
    readonly endTime: number;
    readonly text: string;
}
