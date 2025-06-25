import type {Observable} from 'rxjs';
import {
    catchError,
    concatMap,
    debounceTime,
    distinctUntilChanged,
    filter,
    map,
    BehaviorSubject,
    combineLatest,
    mergeMap,
    skipWhile,
    take,
    tap,
} from 'rxjs';
import Dexie, {liveQuery} from 'dexie';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import {Logger, chunk, groupBy} from 'utils';
import {getService, getServiceFromSrc, observeEnabledServices} from 'services/mediaServices';
import {dispatchMetadataChanges} from 'services/metadata';

export type StorableMediaObject = Omit<MediaObject, 'pager'>;

interface LockedService {
    serviceId: string;
    itemType: ItemType;
}

class ActionsStore extends Dexie {
    private readonly inLibraryChanges!: Dexie.Table<StorableMediaObject, string>;
    private readonly inLibraryChanges$ = new BehaviorSubject<readonly StorableMediaObject[]>([]);
    private readonly ratingChanges!: Dexie.Table<StorableMediaObject, string>;
    private readonly ratingChanges$ = new BehaviorSubject<readonly StorableMediaObject[]>([]);
    private readonly lockedService$ = new BehaviorSubject<LockedService | null>(null);
    private readonly logger = new Logger('actionsStore');

    constructor() {
        super('ampcast/pending-actions');

        this.version(2).stores({
            inLibraryChanges: `&src`,
            ratingChanges: `&src`,
        });

        liveQuery(() => this.inLibraryChanges.toArray()).subscribe(this.inLibraryChanges$);
        liveQuery(() => this.ratingChanges.toArray()).subscribe(this.ratingChanges$);

        observeEnabledServices()
            .pipe(
                skipWhile((services) => services.length === 0),
                tap((services) => this.registerServices(services)),
                take(1)
            )
            .subscribe(this.logger);

        // Clear the store if actions haven't been processed within ten seconds.
        this.lockedService$
            .pipe(
                map((locked) => !!locked),
                distinctUntilChanged(),
                debounceTime(10_000),
                filter((locked) => !locked),
                mergeMap(() => this.clear())
            )
            .subscribe(this.logger);
    }

    registerServices(services: readonly MediaService[]): void {
        for (const service of services) {
            this.registerService(service);
        }
    }

    lock(serviceId: string, itemType: ItemType): void {
        this.lockedService$.next({serviceId, itemType});
    }

    unlock(): void {
        this.lockedService$.next(null);
    }

    getInLibrary(item: MediaObject, defaultValue?: boolean | undefined): boolean | undefined {
        const changedItem = this.getInLibraryChangedItem(item);
        return changedItem ? changedItem.inLibrary : defaultValue;
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
                if (this.isLockedObject(item)) {
                    await this.ratingChanges.put(this.createStorableMediaObject({...item, rating}));
                } else {
                    const changedItem = this.getRatingChangedItem(item);
                    if (changedItem) {
                        await this.ratingChanges.delete(changedItem.src);
                    }
                    await service.rate(item, rating);
                }
                dispatchMetadataChanges({
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
                const toggledItem = this.getInLibraryChangedItem(item);
                if (toggledItem) {
                    await this.inLibraryChanges.delete(toggledItem.src);
                }
                if (this.isLockedObject(item)) {
                    if (!toggledItem) {
                        await this.inLibraryChanges.put(
                            this.createStorableMediaObject({...item, inLibrary})
                        );
                    }
                } else {
                    await service.store(item, inLibrary);
                }
                dispatchMetadataChanges({
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

    private observeInLibraryChanges(
        service: MediaService
    ): Observable<readonly StorableMediaObject[]> {
        return this.observeUpdates(service, this.inLibraryChanges$);
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
        return combineLatest([updates$, this.lockedService$]).pipe(
            filter(([items]) => items.length > 0),
            map(([items]) =>
                items.filter(
                    (item) => item.src.startsWith(`${service.id}:`) && !this.isLockedObject(item)
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
        const applyChanges = async (items: readonly T[]): Promise<void> => {
            const srcs = items.map((item) => item.src);
            await this.ratingChanges.bulkDelete(srcs);
            dispatchMetadataChanges({
                match: (object) => items.some((item) => service.compareForRating(object, item)),
                values: {rating},
            });
        };

        if (service.bulkRate) {
            await service.bulkRate(items, rating);
            applyChanges(items);
        } else {
            const chunks = chunk(items, chunkSize);
            for (const chunk of chunks) {
                await Promise.all(chunk.map((item) => service.rate!(item, rating)));
                applyChanges(chunk);
            }
        }
    }

    private async bulkStore<T extends MediaObject>(
        service: MediaService,
        items: readonly T[],
        inLibrary: boolean,
        chunkSize = 10
    ): Promise<void> {
        const applyChanges = async (items: readonly T[]): Promise<void> => {
            const srcs = items.map((item) => item.src);
            await this.inLibraryChanges.bulkDelete(srcs);
            dispatchMetadataChanges({
                match: (object) => items.some((item) => service.compareForRating(object, item)),
                values: {inLibrary},
            });
        };

        if (service.bulkStore) {
            await service.bulkStore(items, inLibrary);
            applyChanges(items);
        } else {
            const chunks = chunk(items, chunkSize);
            for (const chunk of chunks) {
                await Promise.all(chunk.map((item) => service.store!(item, inLibrary)));
                applyChanges(chunk);
            }
        }
    }

    private async clear(): Promise<void> {
        await Promise.all([this.inLibraryChanges.clear(), this.ratingChanges.clear()]);
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

    private getInLibraryChangedItem(
        item: MediaObject | StorableMediaObject
    ): StorableMediaObject | undefined {
        const service = getServiceFromSrc(item);
        if (service?.store) {
            return this.inLibraryChanges$.value.find((changed) =>
                service.compareForRating(changed as MediaObject, item as MediaObject)
            );
        }
    }

    private getRatingChangedItem(
        item: MediaObject | StorableMediaObject
    ): StorableMediaObject | undefined {
        const service = getServiceFromSrc(item);
        if (service?.rate) {
            return this.ratingChanges$.value.find((changed) =>
                service.compareForRating(changed as MediaObject, item as MediaObject)
            );
        }
    }

    private isLockedObject(item: StorableMediaObject): boolean {
        const locked = this.lockedService$.value;
        if (locked) {
            const [serviceId] = item.src.split(':');
            return locked.serviceId === serviceId && locked.itemType === item.itemType;
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
            this.observeInLibraryChanges(service)
                .pipe(
                    filter((items) => items.length > 0),
                    map((items) => groupBy(items, (item) => String(!!item.inLibrary))),
                    mergeMap((byInLibrary) =>
                        Object.keys(byInLibrary).map((inLibrary) => ({
                            items: byInLibrary[inLibrary as any],
                            inLibrary: inLibrary !== 'false',
                        }))
                    ),
                    concatMap(({items, inLibrary}) =>
                        this.bulkStore(service, items as MediaObject[], inLibrary, maxChunkSize)
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
