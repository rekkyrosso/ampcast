import type {Observable} from 'rxjs';
import {BehaviorSubject, combineLatest, filter, map} from 'rxjs';
import Dexie, {liveQuery} from 'dexie';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import Pin from 'types/Pin';
import {dispatchMediaObjectChanges} from 'services/actions/mediaObjectChanges';
import {Logger} from 'utils';

const logger = new Logger('pinStore');

const UNINITIALIZED: Pin[] = [];

class PinStore extends Dexie {
    private readonly pins!: Dexie.Table<Pin, string>;
    private readonly pins$ = new BehaviorSubject<readonly Pin[]>(UNINITIALIZED);
    private readonly lockedPin$ = new BehaviorSubject<Pin | null>(null);

    constructor() {
        super('ampcast/pins');

        this.version(2).stores({
            pins: `&src`,
        });

        liveQuery(() => this.pins.toArray()).subscribe(this.pins$);
    }

    observePins(): Observable<readonly Pin[]> {
        return combineLatest([this.pins$, this.lockedPin$]).pipe(
            filter(([pins]) => pins !== UNINITIALIZED),
            map(([pins]) => pins)
        );
    }

    observePinsForService(serviceId: string): Observable<readonly Pin[]> {
        return this.observePins().pipe(map(() => this.getPinsForService(serviceId)));
    }

    lock(pin: Pin): void {
        this.lockedPin$.next(pin);
    }

    unlock(): void {
        this.lockedPin$.next(null);
    }

    async addPins(pins: readonly Pin[]): Promise<void> {
        try {
            await this.pins.bulkPut(pins);
        } catch (err) {
            logger.error(err);
        }
    }

    async pin(playlist: MediaPlaylist): Promise<void>;
    async pin(playlists: readonly MediaPlaylist[]): Promise<void>;
    async pin(playlist: readonly MediaPlaylist[] | MediaPlaylist): Promise<void> {
        try {
            const playlists: MediaPlaylist[] = Array.isArray(playlist) ? playlist : [playlist];
            await this.pins.bulkPut(
                playlists.map((playlist) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const {pager, ...pin} = playlist;
                    return {...pin, isPinned: true};
                })
            );
            dispatchMediaObjectChanges(
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
    async unpin(playlist: {src: string}): Promise<void>;
    async unpin(playlist: readonly Pin[] | Pin | {src: string}): Promise<void> {
        try {
            const playlists: {src: string}[] = Array.isArray(playlist) ? playlist : [playlist];
            await this.pins.bulkDelete(playlists.map((playlist) => playlist.src));
            dispatchMediaObjectChanges(
                playlists.map((playlist) => ({
                    match: (object: MediaObject) => object.src === playlist.src,
                    values: {isPinned: false},
                }))
            );
        } catch (err) {
            logger.error(err);
        }
    }

    isLocked(src: string): boolean {
        const lockedPin = this.lockedPin$.value;
        return lockedPin?.src === src;
    }

    isPinned(src: string): boolean {
        const pins = this.pins$.value;
        return pins.findIndex((pin) => pin.src === src) !== -1;
    }

    getPins(): readonly Pin[] {
        return this.pins$.value;
    }

    getPinsForService(serviceId: string): readonly Pin[] {
        const pins = this.pins$.value.slice();
        const lockedPin = this.lockedPin$.value;
        if (lockedPin && !pins.find((pin) => pin.src === lockedPin.src)) {
            pins.push(lockedPin);
        }
        return pins
            .filter((pin) => pin.src.startsWith(`${serviceId}:`))
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
