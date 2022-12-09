import Dexie from 'dexie';
import MediaItem from 'types/MediaItem';

export interface Lookup {
    source: string;
    title: string;
    artist: string;
    item?: MediaItem;
}

class LookupStore extends Dexie {
    private readonly items!: Dexie.Table<Lookup, string>;

    constructor() {
        super('ampcast/lookup');

        this.version(1).stores({
            items: `++id, source, album, artist`,
        });
    }

    async add(
        source: string,
        title: string,
        artist: string,
        item: MediaItem | undefined
    ): Promise<void> {
        this.items.add({source, title, artist, item});
    }

    async get(source: string, title: string, artist: string): Promise<Lookup | undefined> {
        return this.items.get({source, title, artist});
    }
}

const lookupStore = new LookupStore();

export default lookupStore;
