import Dexie from 'dexie';
import MediaItem from 'types/MediaItem';
import {Logger, removeUserData} from 'utils';

const logger = new Logger('lookupStore');

export interface Lookup {
    service: string;
    artist: string;
    title: string;
    items: readonly MediaItem[];
}

class LookupStore extends Dexie {
    private readonly items!: Dexie.Table<Lookup, [string, string, string]>;

    constructor() {
        super('ampcast/lookup');

        this.version(1).stores({
            items: `&[service+artist+title]`,
        });
    }

    async add(
        service: string,
        artist: string,
        title: string,
        items: readonly MediaItem[]
    ): Promise<void> {
        try {
            if (service) {
                logger.log('add', {service, artist, title, items});
                artist = artist.toLowerCase();
                title = title.toLowerCase();
                items = items.map((item) => removeUserData(item));
                await this.items.put({service, artist, title, items});
            }
        } catch (err) {
            logger.error(err);
        }
    }

    async get(service: string, artist: string, title: string): Promise<Lookup | undefined> {
        return this.items.get([service, artist.toLowerCase(), title.toLowerCase()]);
    }
}

const lookupStore = new LookupStore();

export default lookupStore;
