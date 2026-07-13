import LinearType from 'types/LinearType';
import Lyrics, {SyncedLyric} from 'types/Lyrics';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import {Logger} from 'utils';
import {LyricsNotAvailableError} from 'services/errors';
import {getServiceFromSrc, isPlayableSrc} from 'services/mediaServices';
import lrclib from './lrclib';

const logger = new Logger('lyrics');

const lyricsCache: Record<string, Lyrics | Promise<Lyrics | null> | null> = {};

export async function getLyrics(item: MediaItem): Promise<Lyrics | null> {
    const service = getServiceFromSrc(item);
    const src = item.src;
    if (
        service?.lyricsDisabled ||
        (item.linearType && item.linearType !== LinearType.MusicTrack) ||
        item.duration < 30 ||
        item.duration > 1_200 ||
        !isPlayableSrc(src, true)
    ) {
        throw new LyricsNotAvailableError();
    }
    const cached = lyricsCache[src];
    if (cached === undefined) {
        const promise = fetchLyrics(service, item);
        lyricsCache[src] = promise;
        const lyrics = await promise;
        return lyrics;
    } else if (cached instanceof Promise) {
        const lyrics = await cached;
        return lyrics;
    } else {
        return cached;
    }
}

async function fetchLyrics(
    service: MediaService | undefined,
    item: MediaItem
): Promise<Lyrics | null> {
    let lyrics: Lyrics | null = null;
    // Fetch from the media service first.
    if (service?.getLyrics) {
        try {
            lyrics = await service.getLyrics(item);
            if (lyrics) {
                lyrics = {
                    ...lyrics,
                    provider: {
                        icon: service.icon,
                        name: service.name,
                    },
                };
            }
        } catch (err: any) {
            if (err.status !== 404) {
                logger.error(err);
            }
        }
    }
    // Ignore empty arrays.
    if (lyrics?.synced?.length === 0) {
        (lyrics as any).synced = undefined;
    }
    // Fetch from LRCLIB if there are no synced lyrics.
    if (!lyrics?.synced) {
        try {
            const lrclibLyrics = await lrclib.getLyrics(item);
            if (lrclibLyrics?.synced || !lyrics) {
                lyrics = lrclibLyrics;
            }
        } catch (err) {
            logger.error(err);
        }
    }
    if (lyrics?.synced?.length === 0) {
        (lyrics as any).synced = undefined;
    }
    if (lyrics?.synced) {
        (lyrics as any).synced = enhanceSyncedLyrics(item, lyrics.synced);
    }
    lyrics = lyrics || null;
    lyricsCache[item.src] = lyrics;
    return lyrics;
}

function enhanceSyncedLyrics(
    item: MediaItem,
    synced: readonly SyncedLyric[]
): readonly SyncedLyric[] {
    // Tidy up synced lyrics (make them suitable for display).
    // We are going to mutate the response data.
    const firstLine = synced[0];
    if (firstLine.startTime !== 0) {
        // Add a blank first line (this will be converted to something prettier).
        const newFirstLine = {
            startTime: Math.max(firstLine.startTime - 10, 0),
            endTime: firstLine.startTime,
            text: '',
        };
        (synced as any).unshift(newFirstLine);
    }
    // Make sure the last line has an `endTime`.
    const lastLine = synced.at(-1);
    if (lastLine?.endTime === 0) {
        const endTime = lastLine.startTime + 5;
        (lastLine as any).endTime = item.duration ? Math.min(endTime, item.duration) : endTime;
    }
    return synced;
}
