import Lyrics from 'types/Lyrics';
import MediaItem from 'types/MediaItem';
import {Logger} from 'utils';
import {LyricsNotAvailableError} from 'services/errors';
import {getServiceFromSrc, isBranded, isPlayableSrc} from 'services/mediaServices';
import lrclib from './lrclib';

const logger = new Logger('lyrics');

const lyricsCache: Record<string, Lyrics | null> = {};

export async function getLyrics(item: MediaItem): Promise<Lyrics | null> {
    const src = item.src;
    if (!isPlayableSrc(src, true)) {
        throw new LyricsNotAvailableError();
    }
    const service = getServiceFromSrc(item);
    if (service && isBranded(service)) {
        throw new LyricsNotAvailableError();
    }
    if (lyricsCache[src] === undefined) {
        let lyrics: Lyrics | null = null;
        if (service?.getLyrics) {
            try {
                lyrics = await service.getLyrics(item);
            } catch (err) {
                logger.warn(err);
            }
        }
        if (!lyrics?.synced) {
            try {
                const lrclibLyrics = await lrclib.getLyrics(item);
                if (lrclibLyrics?.synced) {
                    lyrics = lrclibLyrics;
                }
            } catch (err) {
                logger.warn(err);
            }
        }
        lyricsCache[src] = lyrics || null;
    }
    return lyricsCache[src];
}
