import Dexie from 'dexie';
import {Logger} from 'utils';
import {YouTubeCacheable} from './YouTubePager';

const logger = new Logger('youtubeCache');

export interface YouTubeCacheEntry {
    readonly key: string;
    readonly response: YouTubeCacheable;
    readonly timeStamp: number;
}

class YouTubeCache extends Dexie {
    private readonly entries!: Dexie.Table<YouTubeCacheEntry, string>;

    constructor() {
        super('ampcast/youtube/cache');

        this.version(1).stores({
            entries: `&key, timeStamp`,
        });

        setTimeout(() => this.removeExpired());
    }

    async store(key: string, response: YouTubeCacheable): Promise<void> {
        try {
            await this.entries.put({key, response, timeStamp: Date.now()});
        } catch (err) {
            logger.error(err);
        }
    }

    async fetch(key: string): Promise<YouTubeCacheable | undefined> {
        try {
            const entry = await this.entries.get(key);
            return entry?.response;
        } catch (err) {
            logger.error(err);
        }
    }

    private removeExpired(): void {
        const week = 7 * 24 * 60 * 60_000;
        const expiredTime = Date.now() - 2 * week;
        this.entries.where('timeStamp').below(expiredTime).delete();
    }
}

const youtubeCache = new YouTubeCache();

export default youtubeCache;
