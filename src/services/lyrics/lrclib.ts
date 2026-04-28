import {filterMatches} from 'services/metadata';
import ItemType from 'types/ItemType';
import Lyrics, {SyncedLyric} from 'types/Lyrics';
import MediaItem from 'types/MediaItem';
import {filterNotEmpty} from 'utils';

type LyricsItem = MediaItem & Pick<LRCLIB.Lyrics, 'plainLyrics' | 'syncedLyrics'>;

const apiHost = 'https://lrclib.net/api';

async function getLyrics(item: MediaItem): Promise<Lyrics | null> {
    const {artists: [artist = ''] = [], title, duration} = item;
    if (artist && title && duration) {
        const q = encodeURIComponent(`${title} ${artist}`);
        const response = await fetch(`${apiHost}/search?q=${q}`, {
            headers: {Accept: 'application/json'},
        });
        if (!response.ok) {
            throw response;
        }
        const data: LRCLIB.Lyrics[] = await response.json();
        let matches: readonly LyricsItem[] = data
            .filter((data) => Math.abs(data.duration - item.duration) < 2)
            .map((data) => createMediaItem(data));

        matches = filterMatches(matches, item);
        matches = filterNotEmpty(matches, (match) => !!match.syncedLyrics);
        const match = matches[0];
        if (match) {
            const plain = match.plainLyrics.split(/\n/);
            const synced = parseSyncedLyrics(match.syncedLyrics);
            return {plain, synced};
        }
    }
    return null;
}

function createMediaItem(lyrics: LRCLIB.Lyrics): LyricsItem {
    return {
        src: `lrclib:lyrics:${lyrics.id}`,
        itemType: ItemType.Media,
        title: lyrics.trackName,
        artists: lyrics.artistName ? [lyrics.artistName] : undefined,
        album: lyrics.albumName,
        duration: lyrics.duration,
        playedAt: 0,
        plainLyrics: lyrics.plainLyrics,
        syncedLyrics: lyrics.syncedLyrics,
    };
}

function parseSyncedLyrics(lyrics: string | null): Lyrics['synced'] | undefined {
    return lyrics
        ?.split(/\n/)
        .map(parseSyncedLyric)
        .map((lyric, index, lyrics) => {
            return {...lyric, endTime: lyrics.at(index + 1)?.startTime || 0};
        });
}

function parseSyncedLyric(line: string): Pick<SyncedLyric, 'startTime' | 'text'> {
    const text = line.replace(/\[[^\]]+\]\s*(.*)/, '$1');
    const timeStamp = line.replace(/\[([^\]]+)\].*/, '$1');
    const [minutes, seconds] = timeStamp.split(':').map(parseFloat);
    const startTime = minutes * 60 + seconds;
    return {startTime, text};
}

export default {getLyrics};
