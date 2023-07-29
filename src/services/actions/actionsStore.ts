import type {Observable} from 'rxjs';
import {
    catchError,
    concatMap,
    distinctUntilChanged,
    filter,
    map,
    BehaviorSubject,
    combineLatest,
    mergeMap,
} from 'rxjs';
import Dexie, {liveQuery} from 'dexie';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import {getService, getServiceFromSrc} from 'services/mediaServices';
import {Logger, chunk, groupBy} from 'utils';
import mediaObjectChanges from './mediaObjectChanges';

export type StorableMediaObject = Omit<MediaObject, 'pager'>;

interface Lock {
    serviceId: string;
    itemType: ItemType;
}

class ActionsStore extends Dexie {
    private readonly libraryRemovals!: Dexie.Table<StorableMediaObject, string>;
    private readonly libraryRemovals$ = new BehaviorSubject<readonly StorableMediaObject[]>([]);
    private readonly ratingChanges!: Dexie.Table<StorableMediaObject, string>;
    private readonly ratingChanges$ = new BehaviorSubject<readonly StorableMediaObject[]>([]);
    private readonly lock$ = new BehaviorSubject<Lock | null>(null);
    private readonly logger = new Logger('actionsStore');

    constructor() {
        super('ampcast/pending-actions');

        this.version(1).stores({
            libraryRemovals: `&src`,
            ratingChanges: `&src`,
        });

        liveQuery(() => this.ratingChanges.toArray()).subscribe(this.ratingChanges$);
        liveQuery(() => this.libraryRemovals.toArray()).subscribe(this.libraryRemovals$);
    }

    registerServices(services: readonly MediaService[]): void {
        for (const service of services) {
            this.registerService(service);
        }
    }

    lock(serviceId: string, itemType: ItemType): void {
        this.lock$.next({serviceId, itemType});
    }

    unlock(): void {
        this.lock$.next(null);
    }

    getInLibrary(item: MediaObject, defaultValue?: boolean | undefined): boolean | undefined {
        return this.getLibraryRemovedItem(item) ? false : defaultValue;
    }

    getRating(item: MediaObject, defaultValue?: number | undefined): number | undefined {
        const changedItem = this.getRatingChangedItem(item);
        return changedItem ? changedItem.rating : defaultValue;
    }

    async rate(item: MediaObject, rating: number): Promise<void> {
        const src = item.src;
        const [serviceId] = src.split(':');
        const service = getService(serviceId);
        if (service) {
            if (service.rate) {
                if (this.isLocked(item)) {
                    await this.ratingChanges.put(this.createStorableMediaObject({...item, rating}));
                } else {
                    const changedItem = this.getRatingChangedItem(item);
                    if (changedItem) {
                        await this.ratingChanges.delete(changedItem.src);
                    }
                    await service.rate(item, rating);
                }
                mediaObjectChanges.dispatch({
                    match: (object) => service.compareForRating(object, item),
                    values: {rating},
                });
            } else {
                throw Error(`rate() not supported by ${serviceId}`);
            }
        } else {
            throw Error(`Service not found '${serviceId}'`);
        }
    }

    async store<T extends MediaObject>(item: T, inLibrary: boolean): Promise<void> {
        const src = item.src;
        const [serviceId] = src.split(':');
        const service = getService(serviceId);
        if (service) {
            if (service.store) {
                if (this.isLocked(item)) {
                    if (inLibrary) {
                        await this.libraryRemovals.delete(src);
                    } else {
                        await this.libraryRemovals.put(this.createStorableMediaObject(item));
                    }
                } else {
                    const removedItem = this.getLibraryRemovedItem(item);
                    if (removedItem) {
                        await this.libraryRemovals.delete(removedItem.src);
                    }
                    await service.store(item, inLibrary);
                }
                mediaObjectChanges.dispatch({
                    match: (object) => service.compareForRating(object, item),
                    values: {inLibrary},
                });
            } else {
                throw Error(`store() not supported by ${serviceId}`);
            }
        } else {
            throw Error(`Service not found '${serviceId}'`);
        }
    }

    private observeLibraryRemovals(
        service: MediaService
    ): Observable<readonly StorableMediaObject[]> {
        return this.observeUpdates(service, this.libraryRemovals$);
    }

    private observeRatingChanges(
        service: MediaService
    ): Observable<readonly StorableMediaObject[]> {
        return this.observeUpdates(service, this.ratingChanges$);
    }

    private observeUpdates(
        service: MediaService,
        updates$: Observable<readonly StorableMediaObject[]>
    ): Observable<readonly StorableMediaObject[]> {
        return combineLatest([updates$, this.lock$]).pipe(
            filter(([items]) => items.length > 0),
            map(([items]) =>
                items.filter(
                    (item) => item.src.startsWith(`${service.id}:`) && !this.isLocked(item)
                )
            ),
            distinctUntilChanged((a, b) => {
                const srcsA = a.map((item) => item.src).sort();
                const srcsB = b.map((item) => item.src).sort();
                return String(srcsA) === String(srcsB);
            })
        );
    }

    private async bulkRate<T extends MediaObject>(
        service: MediaService,
        items: readonly T[],
        rating: number,
        chunkSize = 10
    ): Promise<void> {
        const applyRatingChanges = async (items: readonly T[]): Promise<void> => {
            const srcs = items.map((item) => item.src);
            await this.ratingChanges.bulkDelete(srcs);
            mediaObjectChanges.dispatch({
                match: (object) => items.some((item) => service.compareForRating(object, item)),
                values: {rating},
            });
        };

        if (service.bulkRate) {
            await service.bulkRate(items, rating);
            applyRatingChanges(items);
        } else {
            const chunks = chunk(items, chunkSize);
            for (const chunk of chunks) {
                await Promise.all(chunk.map((item) => service.rate!(item, rating)));
                applyRatingChanges(chunk);
            }
        }
    }

    private async bulkRemoveFromLibrary<T extends MediaObject>(
        service: MediaService,
        items: readonly T[],
        chunkSize = 10
    ): Promise<void> {
        const inLibrary = false;

        const applyLibraryRemovals = async (items: readonly T[]): Promise<void> => {
            const srcs = items.map((item) => item.src);
            await this.libraryRemovals.bulkDelete(srcs);
            mediaObjectChanges.dispatch({
                match: (object) => items.some((item) => service.compareForRating(object, item)),
                values: {inLibrary},
            });
        };

        if (service.bulkStore) {
            await service.bulkStore(items, inLibrary);
            applyLibraryRemovals(items);
        } else {
            const chunks = chunk(items, chunkSize);
            for (const chunk of chunks) {
                await Promise.all(chunk.map((item) => service.store!(item, inLibrary)));
                applyLibraryRemovals(chunk);
            }
        }
    }

    private createStorableMediaObject<T extends MediaObject>(item: T): StorableMediaObject {
        if ('pager' in item) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {pager, ...storableItem} = item;
            return storableItem;
        } else {
            return item;
        }
    }

    private getRatingChangedItem(
        item: MediaObject | StorableMediaObject
    ): StorableMediaObject | undefined {
        const service = getServiceFromSrc(item);
        if (service?.rate) {
            return this.ratingChanges$
                .getValue()
                .find((changed) =>
                    service.compareForRating(changed as MediaObject, item as MediaObject)
                );
        }
    }

    private getLibraryRemovedItem(
        item: MediaObject | StorableMediaObject
    ): StorableMediaObject | undefined {
        const service = getServiceFromSrc(item);
        if (service?.store) {
            return this.libraryRemovals$
                .getValue()
                .find((removed) =>
                    service.compareForRating(removed as MediaObject, item as MediaObject)
                );
        }
    }

    private isLocked(item: StorableMediaObject): boolean {
        const lock = this.lock$.getValue();
        if (lock) {
            const [serviceId] = item.src.split(':');
            return lock.serviceId === serviceId && lock.itemType === item.itemType;
        } else {
            return false;
        }
    }

    private registerService(service: MediaService, maxChunkSize?: number): void {
        if (service.rate) {
            const logger = this.logger.id(`${service.id}/rating`);
            this.observeRatingChanges(service)
                .pipe(
                    filter((items) => items.length > 0),
                    map((items) => groupBy(items, (item) => item.rating!)),
                    mergeMap((byRating) =>
                        Object.keys(byRating).map((rating) => ({
                            items: byRating[rating as any],
                            rating: Number(rating),
                        }))
                    ),
                    concatMap(({items, rating}) =>
                        this.bulkRate(service, items as MediaObject[], rating, maxChunkSize)
                    ),
                    catchError((err) => {
                        logger.error(err);
                        return [];
                    })
                )
                .subscribe(logger);
        }
        if (service.store) {
            const logger = this.logger.id(`${service.id}/inLibrary`);
            this.observeLibraryRemovals(service)
                .pipe(
                    filter((items) => items.length > 0),
                    concatMap((items) =>
                        this.bulkRemoveFromLibrary(service, items as MediaObject[], maxChunkSize)
                    ),
                    catchError((err) => {
                        logger.error(err);
                        return [];
                    })
                )
                .subscribe(logger);
        }
    }
}

const actionsStore = new ActionsStore();

export default actionsStore;
