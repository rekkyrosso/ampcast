import type {Observable} from 'rxjs';
import {BehaviorSubject, combineLatest} from 'rxjs';
import {distinctUntilChanged, filter, map} from 'rxjs/operators';
import Dexie, {liveQuery} from 'dexie';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import {getService} from 'services/mediaServices';
import mediaObjectChanges from './mediaObjectChanges';

export type LibraryObject = Omit<MediaObject, 'pager'>;

interface Lock {
    serviceId: string;
    itemType: ItemType;
}

class LibraryStore extends Dexie {
    private readonly libraryRemovals!: Dexie.Table<LibraryObject, string>;
    private readonly libraryRemovals$ = new BehaviorSubject<readonly LibraryObject[]>([]);
    private readonly lock$ = new BehaviorSubject<Lock | null>(null);

    constructor() {
        super('ampcast/library-removals');

        this.version(1).stores({
            libraryRemovals: `&src`,
        });

        liveQuery(() => this.libraryRemovals.toArray()).subscribe(this.libraryRemovals$);
    }

    observeRemovals(serviceId: string): Observable<readonly LibraryObject[]> {
        return combineLatest([this.libraryRemovals$, this.lock$]).pipe(
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
                        await this.libraryRemovals.put(this.createLibraryObject(item));
                    }
                } else {
                    await service.store(item, inLibrary);
                }
                mediaObjectChanges.dispatch({
                    match: (object) => object.src === src,
                    values: {inLibrary},
                });
            } else {
                throw Error(`store() not supported by ${serviceId}.`);
            }
        } else {
            throw Error(`Service not found '${serviceId}'.`);
        }
    }

    async applyRemovals(items: readonly MediaObject[]): Promise<void> {
        if (items.length > 0) {
            const srcs = items.map((item) => item.src);
            await this.libraryRemovals.bulkDelete(srcs);
            mediaObjectChanges.dispatch({
                match: (object) => srcs.includes(object.src),
                values: {inLibrary: false},
            });
        }
    }

    get(src: string, defaultValue?: boolean | undefined): boolean | undefined {
        return this.isRemoved(src) ? false : defaultValue;
    }

    private isRemoved(src: string): boolean {
        return this.libraryRemovals$.getValue().findIndex((item) => item.src === src) !== -1;
    }

    private isLocked(item: LibraryObject): boolean {
        const lock = this.lock$.getValue();
        if (lock) {
            const [serviceId] = item.src.split(':');
            return lock.serviceId === serviceId && lock.itemType === item.itemType;
        } else {
            return false;
        }
    }

    private createLibraryObject<T extends MediaObject>(item: T): LibraryObject {
        if ('pager' in item) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {pager, ...ratingObject} = item;
            return ratingObject;
        } else {
            return item;
        }
    }
}

const libraryStore = new LibraryStore();

export default libraryStore;
