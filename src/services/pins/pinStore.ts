import type {Observable} from 'rxjs';
import {BehaviorSubject, Subject} from 'rxjs';
import {filter} from 'rxjs/operators';
import Dexie, {liveQuery} from 'dexie';
import MediaPlaylist from 'types/MediaPlaylist';
import {Pin} from 'types/Pin';
import {Logger} from 'utils';

const logger = new Logger('pinStore');

const UNINITIALIZED: Pin[] = [];

class PinStore extends Dexie {
    private readonly pins!: Dexie.Table<Pin, string>;
    private readonly pins$ = new BehaviorSubject<readonly Pin[]>(UNINITIALIZED);
    private readonly additions$ = new Subject<readonly Pin[]>();
    private readonly removals$ = new Subject<readonly Pin[]>();

    constructor() {
        super('ampcast/pins');

        this.version(1).stores({
            pins: `&src`,
        });

        liveQuery(() => this.pins.toArray()).subscribe(this.pins$);
    }

    async pin(playlist: MediaPlaylist): Promise<void>;
    async pin(playlists: readonly MediaPlaylist[]): Promise<void>;
    async pin(playlists: readonly MediaPlaylist[] | MediaPlaylist): Promise<void> {
        try {
            const additions = Array.isArray(playlists) ? playlists : [playlists];
            logger.log('add', {playlists});
            await this.pins.bulkPut(
                additions.map((playlist) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const {pager: _, ...pin} = playlist;
                    return {...pin, isPinned: true};
                })
            );
            this.additions$.next(additions);
        } catch (err) {
            logger.error(err);
        }
    }

    async unpin(playlist: Pin): Promise<void>;
    async unpin(playlists: readonly Pin[]): Promise<void>;
    async unpin(playlists: readonly Pin[] | Pin): Promise<void> {
        try {
            const removals = Array.isArray(playlists) ? playlists : [playlists];
            logger.log('unpin', {removals});
            await this.pins.bulkDelete(removals.map((playlist) => playlist.src));
            this.removals$.next(removals);
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

    observeAdditions(): Observable<readonly Pin[]> {
        return this.additions$;
    }

    observeRemovals(): Observable<readonly Pin[]> {
        return this.removals$;
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
