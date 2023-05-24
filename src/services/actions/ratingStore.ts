import type {Observable} from 'rxjs';
import {
    catchError,
    concatMap,
    distinctUntilChanged,
    filter,
    map,
    BehaviorSubject,
    combineLatest,
} from 'rxjs';
import Dexie, {liveQuery} from 'dexie';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import {getService} from 'services/mediaServices';
import mediaObjectChanges from './mediaObjectChanges';
import {Logger, exists} from 'utils';
import MediaService from 'types/MediaService';

export type RatingObject = Omit<MediaObject, 'pager'>;

interface Lock {
    serviceId: string;
    itemType: ItemType;
}

class RatingStore extends Dexie {
    private readonly ratingRemovals!: Dexie.Table<RatingObject, string>;
    private readonly ratingRemovals$ = new BehaviorSubject<readonly RatingObject[]>([]);
    private readonly lock$ = new BehaviorSubject<Lock | null>(null);
    private readonly logger = new Logger('ratingStore');

    constructor() {
        super('ampcast/rating-removals');

        this.version(1).stores({
            ratingRemovals: `&src`,
        });

        liveQuery(() => this.ratingRemovals.toArray()).subscribe(this.ratingRemovals$);
    }

    addObserver(service: MediaService, chunkSize = 10): void {
        if (!service.rate) {
            this.logger.error(`rate() not supported by ${service.id}.`);
            return;
        }

        const logger = this.logger.id(service.id);

        this.observeRemovals(service.id)
            .pipe(
                map((items) => items.slice(0, chunkSize)),
                concatMap((items) =>
                    Promise.all(
                        items.map((item) => service.rate!(item as MediaObject, 0).then(() => item))
                    )
                ),
                concatMap((items) => this.applyRemovals(items as MediaObject[])),
                catchError((err) => {
                    logger.error(err);
                    return [];
                })
            )
            .subscribe(logger);
    }

    observeRemovals(serviceId: string): Observable<readonly RatingObject[]> {
        return combineLatest([this.ratingRemovals$, this.lock$]).pipe(
            filter(([items]) => items.length > 0),
            map(([items]) =>
                items.filter((item) => item.src.startsWith(`${serviceId}:`) && !this.isLocked(item))
            ),
            distinctUntilChanged((a, b) => {
                const keysA = a.map((item) => item.src).sort();
                const keysB = b.map((item) => item.src).sort();
                return String(keysA) === String(keysB);
            })
        );
    }

    lock(serviceId: string, itemType: ItemType): void {
        this.lock$.next({serviceId, itemType});
    }

    unlock(): void {
        this.lock$.next(null);
    }

    async rate(item: MediaObject, rating: number): Promise<void> {
        const src = item.src;
        const [serviceId] = src.split(':');
        const service = getService(serviceId);
        if (service) {
            if (service.rate) {
                const removedItem = this.getRemovedItem(item);
                if (this.isLocked(item)) {
                    if (rating) {
                        if (removedItem) {
                            await this.ratingRemovals.delete(removedItem.src);
                        }
                        if (rating > 1) {
                            // Update star ratings
                            await service.rate(item, rating);
                        }
                    } else {
                        if (!removedItem) {
                            await this.ratingRemovals.put(this.createRatingObject(item));
                        }
                    }
                } else {
                    if (removedItem) {
                        await this.ratingRemovals.delete(removedItem.src);
                    }
                    await service.rate(item, rating);
                }
                mediaObjectChanges.dispatch({
                    match: (object) => service.compareForRating(object, item),
                    values: {rating},
                });
            } else {
                throw Error(`rate() not supported by ${serviceId}.`);
            }
        } else {
            throw Error(`Service not found '${serviceId}'.`);
        }
    }

    get(item: MediaObject, defaultValue?: number | undefined): number | undefined {
        return this.getRemovedItem(item) ? 0 : defaultValue;
    }

    async applyRemovals(items: readonly MediaObject[]): Promise<void> {
        const removals = items.map((item) => this.getRemovedItem(item)).filter(exists);
        if (removals.length > 0) {
            const srcs = removals.map((item) => item.src);
            await this.ratingRemovals.bulkDelete(srcs);
            mediaObjectChanges.dispatch({
                match: (object) => {
                    const [serviceId] = object.src.split(':');
                    const service = getService(serviceId);
                    return removals.some((removal) =>
                        service?.compareForRating(object, removal as MediaObject)
                    );
                },
                values: {rating: 0},
            });
        }
    }

    private getRemovedItem(item: MediaObject): RatingObject | undefined {
        const [serviceId] = item.src.split(':');
        const service = getService(serviceId);
        if (service?.rate) {
            return this.ratingRemovals$
                .getValue()
                .find((removal) => service.compareForRating(removal as MediaObject, item));
        }
    }

    private isLocked(item: RatingObject): boolean {
        const lock = this.lock$.getValue();
        if (lock) {
            const [serviceId] = item.src.split(':');
            return lock.serviceId === serviceId && lock.itemType === item.itemType;
        } else {
            return false;
        }
    }

    private createRatingObject<T extends MediaObject>(item: T): RatingObject {
        if ('pager' in item) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {pager, ...ratingObject} = item;
            return ratingObject;
        } else {
            return item;
        }
    }
}

const ratingStore = new RatingStore();

export default ratingStore;
