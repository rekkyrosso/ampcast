import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {filter} from 'rxjs/operators';
import Dexie, {liveQuery} from 'dexie';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import Pin from 'types/Pin';
import mediaObjectChanges from 'services/actions/mediaObjectChanges';
import {Logger} from 'utils';

const logger = new Logger('pinStore');

const UNINITIALIZED: Pin[] = [];

class PinStore extends Dexie {
    private readonly pins!: Dexie.Table<Pin, string>;
    private readonly pins$ = new BehaviorSubject<readonly Pin[]>(UNINITIALIZED);

    constructor() {
        super('ampcast/pins');

        this.version(1).stores({
            pins: `&src`,
        });

        liveQuery(() => this.pins.toArray()).subscribe(this.pins$);
    }

    async pin(playlist: MediaPlaylist): Promise<void>;
    async pin(playlists: readonly MediaPlaylist[]): Promise<void>;
    async pin(playlist: readonly MediaPlaylist[] | MediaPlaylist): Promise<void> {
        try {
            const playlists: MediaPlaylist[] = Array.isArray(playlist) ? playlist : [playlist];
            logger.log('add', {playlists});
            await this.pins.bulkPut(
                playlists.map((playlist) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const {pager: _, ...pin} = playlist;
                    return {...pin, isPinned: true};
                })
            );
            mediaObjectChanges.dispatch<MediaPlaylist>(
                playlists.map((playlist) => ({
                    match: (object: MediaObject) => object.src === playlist.src,
                    values: {isPinned: true},
                }))
            );
        } catch (err) {
            logger.error(err);
        }
    }

    async unpin(playlist: Pin): Promise<void>;
    async unpin(playlists: readonly Pin[]): Promise<void>;
    async unpin(playlist: readonly Pin[] | Pin): Promise<void> {
        try {
            const playlists: Pin[] = Array.isArray(playlist) ? playlist : [playlist];
            logger.log('unpin', {playlists});
            await this.pins.bulkDelete(playlists.map((playlist) => playlist.src));
            mediaObjectChanges.dispatch<MediaPlaylist>(
                playlists.map((playlist) => ({
                    match: (object: MediaObject) => object.src === playlist.src,
                    values: {isPinned: false},
                }))
            );
        } catch (err) {
            logger.error(err);
        }
    }

    isPinned(src: string): boolean {
        const pins = this.pins$.getValue();
        return pins.findIndex((pin) => pin.src === src) !== -1;
    }

    observe(): Observable<readonly Pin[]> {
        return this.pins$.pipe(filter((items) => items !== UNINITIALIZED));
    }

    getPinsForService(service: string): readonly Pin[] {
        const pins = this.pins$.getValue();
        return pins
            .filter((pin) => pin.src.startsWith(`${service}:`))
            .sort((a, b) =>
                a.title.localeCompare(b.title, undefined, {
                    sensitivity: 'accent',
                    ignorePunctuation: true,
                })
            );
    }
}

const pinStore = new PinStore();

export default pinStore;
