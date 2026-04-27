import Lyrics from 'types/Lyrics';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import {Logger} from 'utils';
// import {getServiceFromSrc, isBranded} from 'services/mediaServices';
import {getServiceFromSrc} from 'services/mediaServices';

const logger = new Logger('lyrics');

const lyricsCache: Record<string, Lyrics | null> = {};

export function canShowLyrics(item: MediaItem): boolean {
    if (item.mediaType === MediaType.Video) {
        return false;
    }
    const service = getServiceFromSrc(item);
    // return service ? !isBranded(service) : true; // TODO: Fallback to LRCLIB.
    return !!service?.getLyrics;
}

export async function getLyrics(item: MediaItem): Promise<Lyrics | null> {
    const src = item.src;
    if (lyricsCache[src] === undefined) {
        const service = getServiceFromSrc(item);
        if (service?.getLyrics) {
            try {
                lyricsCache[src] = await service.getLyrics(item);
            } catch (err) {
                logger.error(err);
                throw err; // TODO: Fallback to LRCLIB.
            }
        }
        // TODO: Fallback to LRCLIB.
    }
    return lyricsCache[src] ?? null;
}

// export function parsePlainLyrics(lyrics: string): readonly string[] {
//     return lyrics.trim().split(/\s*\n\s*/);
// }
