import Dexie from 'dexie';
import PlaylistItem from 'types/PlaylistItem';
import {Logger} from 'utils';

const logger = new Logger('playlistStore');

class PlaylistStore extends Dexie {
    private readonly keyval!: Dexie.Table<any, string>;

    constructor() {
        super('ampcast/playlist');

        this.version(1).stores({
            keyval: '',
        });
    }

    async getCurrentItemId(): Promise<string> {
        try {
            return this.keyval.get('currently-playing-id') || '';
        } catch (err) {
            logger.error(err);
            return '';
        }
    }

    async setCurrentItemId(id: string): Promise<void> {
        try {
            await this.keyval.put(id, 'currently-playing-id');
        } catch (err) {
            logger.error(err);
        }
    }

    async getItems(): Promise<PlaylistItem[]> {
        try {
            return this.keyval.get('items') || [];
        } catch (err) {
            logger.error(err);
            return [];
        }
    }

    async setItems(items: readonly PlaylistItem[]): Promise<void> {
        try {
            await this.keyval.put(items, 'items');
        } catch (err) {
            logger.error(err);
        }
    }
}

const playlistStore = new PlaylistStore();

export default playlistStore;
