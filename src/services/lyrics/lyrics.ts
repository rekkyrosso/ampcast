import LinearType from 'types/LinearType';
import Lyrics from 'types/Lyrics';
import MediaItem from 'types/MediaItem';
import {Logger} from 'utils';
import {LyricsNotAvailableError} from 'services/errors';
import {getServiceFromSrc, isPlayableSrc} from 'services/mediaServices';
import lrclib from './lrclib';

const logger = new Logger('lyrics');

const lyricsCache: Record<string, Lyrics | null> = {};

export async function getLyrics(item: MediaItem): Promise<Lyrics | null> {
    const service = getServiceFromSrc(item);
    if (service?.lyricsDisabled) {
        throw new LyricsNotAvailableError();
    }
    if (item.linearType && item.linearType !== LinearType.MusicTrack) {
        throw new LyricsNotAvailableError();
    }
    const src = item.src;
    if (!isPlayableSrc(src, true)) {
        throw new LyricsNotAvailableError();
    }
    if (lyricsCache[src] === undefined) {
        let lyrics: Lyrics | null = null;
        if (service?.getLyrics) {
            try {
                lyrics = await service.getLyrics(item);
            } catch (err) {
                logger.error(err);
            }
        }
        // Ignore empty arrays.
        if (lyrics?.synced?.length === 0) {
            (lyrics as any).synced = undefined;
        }
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
        // Ignore empty arrays (again).
        if (lyrics?.synced?.length === 0) {
            (lyrics as any).synced = undefined;
        }
        if (lyrics?.synced) {
            // Tidy up synced lyrics.
            // Make them suitable for display.
            const firstLine = lyrics.synced[0];
            if (firstLine.startTime !== 0) {
                // Add a blank first line.
                const newFirstLine = {
                    startTime: Math.max(firstLine.startTime - 10, 0),
                    endTime: firstLine.startTime,
                    text: '',
                };
                (lyrics.synced as any).unshift(newFirstLine);
            }
            const lastLine = lyrics.synced.at(-1);
            if (lastLine?.endTime === 0) {
                const endTime = lastLine.startTime + 5;
                (lastLine as any).endTime = item.duration
                    ? Math.min(endTime, item.duration)
                    : endTime;
            }
        }
        lyricsCache[src] = lyrics || null;
    }
    return lyricsCache[src];
}
