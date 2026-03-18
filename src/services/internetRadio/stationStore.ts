import type {Observable} from 'rxjs';
import {BehaviorSubject, filter} from 'rxjs';
import Dexie, {liveQuery} from 'dexie';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import {Logger} from 'utils';
import {dispatchMetadataChanges} from 'services/metadata';

const logger = new Logger('stationStore');

const UNINITIALIZED: MediaItem[] = [];
const favorites$ = new BehaviorSubject<readonly MediaItem[]>(UNINITIALIZED);

class StationStore extends Dexie {
    private readonly favorites!: Dexie.Table<MediaItem, string>;

    constructor() {
        super('ampcast/stations');

        this.version(1).stores({
            favorites: `&src`,
        });

        liveQuery(() => this.favorites.toArray()).subscribe((favorites) =>
            favorites$.next(
                favorites.sort((a, b) =>
                    a.title.localeCompare(b.title, undefined, {sensitivity: 'base'})
                )
            )
        );
    }

    observeFavorites(this: unknown): Observable<readonly MediaItem[]> {
        return favorites$.pipe(filter((stations) => stations !== UNINITIALIZED));
    }

    async addFavorite(station: MediaItem): Promise<void>;
    async addFavorite(stations: readonly MediaItem[]): Promise<void>;
    async addFavorite(station: readonly MediaItem[] | MediaItem): Promise<void> {
        try {
            const stations: MediaItem[] = Array.isArray(station) ? station : [station];
            await this.favorites.bulkPut(
                stations.map((station) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const {parentFolder, ...favorite} = station as any;
                    return {...favorite, isFavoriteStation: true};
                })
            );
            dispatchMetadataChanges(
                stations.map((station) => ({
                    match: (object: MediaObject) => object.src === station.src,
                    values: {isFavoriteStation: true},
                }))
            );
        } catch (err) {
            logger.error(err);
        }
    }

    async removeFavorite(station: MediaItem): Promise<void>;
    async removeFavorite(stations: readonly MediaItem[]): Promise<void>;
    async removeFavorite(station: {src: string}): Promise<void>;
    async removeFavorite(station: readonly MediaItem[] | MediaItem | {src: string}): Promise<void> {
        try {
            const stations: {src: string}[] = Array.isArray(station) ? station : [station];
            await this.favorites.bulkDelete(stations.map((station) => station.src));
            dispatchMetadataChanges(
                stations.map((station) => ({
                    match: (object: MediaObject) => object.src === station.src,
                    values: {isFavoriteStation: false},
                }))
            );
        } catch (err) {
            logger.error(err);
        }
    }

    getFavorites(): readonly MediaItem[] {
        return favorites$.value;
    }

    isFavorite({src}: {src: string}): boolean {
        return !!this.getFavorites().find((favorite) => favorite.src === src);
    }
}

const stationStore = new StationStore();

export default stationStore;
