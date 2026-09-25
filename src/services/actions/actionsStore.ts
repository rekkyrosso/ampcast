import {filter, fromEvent, map, Observable, Subject} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import {Logger, chunk, partition} from 'utils';
import {getService, getServiceFromSrc, isPersonalMediaService} from 'services/mediaServices';
import {dispatchMetadataChanges} from 'services/metadata';

type ActionType = 'inLibrary' | 'rating';

interface InLibraryEntry {
    item: MediaObject;
    value: boolean;
    originalValue?: boolean;
}

interface RatingEntry {
    item: MediaObject;
    value: number;
    originalValue?: number;
}

interface BaseLock {
    service: MediaService;
    itemType: ItemType;
}

interface InLibraryLock extends BaseLock {
    actionType: 'inLibrary';
    entries: InLibraryEntry[];
}

interface RatingLock extends BaseLock {
    actionType: 'rating';
    entries: RatingEntry[];
}

type Lock = InLibraryLock | RatingLock;

const logger = new Logger('actionsStore');

const locks: Lock[] = [];
const unlocking = new Map<Lock, Promise<void>>();

const lock$ = new Subject<Lock>();
const unlock$ = new Subject<Lock>();

fromEvent(window, 'pagehide', () => {
    locks.forEach(applyChanges);
});

function observeLock(
    service: MediaService,
    itemType: ItemType,
    actionType: ActionType
): Observable<void> {
    return lock$.pipe(
        filter(
            (lock) =>
                lock.service === service &&
                lock.itemType === itemType &&
                lock.actionType === actionType
        ),
        map(() => undefined)
    );
}

function observeUnlock(
    service: MediaService,
    itemType: ItemType,
    actionType: ActionType
): Observable<boolean> {
    return unlock$.pipe(
        filter(
            (lock) =>
                lock.service === service &&
                lock.itemType === itemType &&
                lock.actionType === actionType
        ),
        map((lock) => lock.entries.some((entry) => entry.value !== entry.originalValue))
    );
}

function getInLibrary(item: MediaObject, defaultValue?: boolean | undefined): boolean | undefined {
    const service = getServiceFromSrc(item);
    if (service) {
        const lock = getLock(service, item.itemType, 'inLibrary') as InLibraryLock;
        const entry = lock?.entries.find((entry) => entry.item.src === item.src);
        if (entry) {
            return entry.value;
        }
    }
    return defaultValue;
}

function getRating(item: MediaObject, defaultValue?: number | undefined): number | undefined {
    const service = getServiceFromSrc(item);
    if (service) {
        const lock = getLock(service, item.itemType, 'rating') as RatingLock;
        const entry = lock?.entries.find((entry) => entry.item.src === item.src);
        if (entry) {
            return entry.value;
        }
    }
    return defaultValue;
}

function isLocked(service: MediaService, itemType: ItemType, actionType: ActionType): boolean {
    return findLockIndex(service, itemType, actionType) !== -1;
}

function lock(service: MediaService, itemType: ItemType, actionType: ActionType): void {
    if (!isLocked(service, itemType, actionType)) {
        const lock = {service, itemType, actionType, entries: []};
        locks.push(lock);
        lock$.next(lock);
    }
}

async function rate(item: MediaObject, rating: number): Promise<void> {
    const src = item.src;
    const [serviceId] = src.split(':');
    const service = getService(serviceId);
    if (service) {
        if (service.rate) {
            const lockIndex = findLockIndex(service, item.itemType, 'rating');
            if (lockIndex === -1) {
                await service.rate(item, rating);
            } else {
                const lock = locks[lockIndex] as RatingLock;
                const entries = lock.entries;
                const index = entries.findIndex((entry) => entry.item.src === item.src);
                if (index === -1) {
                    entries.push({
                        item,
                        value: rating,
                        originalValue: item.rating,
                    });
                } else {
                    const entry = entries[index];
                    entries[index] = {...entry, value: rating};
                }
            }
            dispatchMetadataChanges({
                match: (object) => service.compareForRating(object, item),
                values: {rating},
            });
        } else {
            throw Error(`rate() not supported by ${service.name}`);
        }
    } else {
        throw Error(`Service not found: '${serviceId}'`);
    }
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    const src = item.src;
    const [serviceId] = src.split(':');
    const service = getService(serviceId);
    if (service) {
        if (service.store) {
            const lockIndex = findLockIndex(service, item.itemType, 'inLibrary');
            if (lockIndex === -1) {
                await service.store(item, inLibrary);
            } else {
                const lock = locks[lockIndex] as InLibraryLock;
                const entries = lock.entries;
                const index = entries.findIndex((entry) => entry.item.src === item.src);
                if (index === -1) {
                    entries.push({
                        item,
                        value: inLibrary,
                        originalValue: item.inLibrary,
                    });
                } else {
                    const entry = entries[index];
                    entries[index] = {...entry, value: inLibrary};
                }
            }
            dispatchMetadataChanges({
                match: (object) => service.compareForRating(object, item),
                values: {inLibrary},
            });
        } else {
            throw Error(`store() not supported by ${service.name}`);
        }
    } else {
        throw Error(`Service not found: '${serviceId}'`);
    }
}

async function unlock(
    service: MediaService,
    itemType: ItemType,
    actionType: ActionType
): Promise<void> {
    const lock = getLock(service, itemType, actionType);
    if (lock) {
        if (!unlocking.has(lock)) {
            unlocking.set(lock, applyChanges(lock));
        }
        return unlocking.get(lock);
    }
}

export default {
    observeLock,
    observeUnlock,
    getInLibrary,
    getRating,
    isLocked,
    lock,
    rate,
    store,
    unlock,
};

async function applyChanges(lock: Lock): Promise<void> {
    try {
        if (lock.actionType === 'inLibrary') {
            await applyInLibraryChanges(lock);
        } else {
            await applyRatingChanges(lock);
        }
    } catch (err) {
        logger.error(err);
    }
    const index = locks.indexOf(lock);
    locks.splice(index, 1);
    unlocking.delete(lock);
    unlock$.next(lock);
}

async function applyInLibraryChanges(lock: InLibraryLock): Promise<void> {
    const service = lock.service;
    const entries = lock.entries.filter((entry) => entry.value !== entry.originalValue);
    if (service.bulkStore) {
        const [additions, removals] = partition(entries, (entry) => entry.value);
        await Promise.all([
            service.bulkStore(
                removals.map((entry) => entry.item),
                false
            ),
            service.bulkStore(
                additions.map((entry) => entry.item),
                true
            ),
        ]);
    } else {
        const chunkSize = isPersonalMediaService(service) ? 10 : 5;
        const chunks = chunk(entries, chunkSize);
        for (const chunk of chunks) {
            await Promise.all(chunk.map((entry) => service.store!(entry.item, entry.value)));
        }
    }
}

async function applyRatingChanges(lock: RatingLock): Promise<void> {
    const service = lock.service;
    const entries = lock.entries.filter((entry) => entry.value !== entry.originalValue);
    if (service.bulkRate) {
        const objects = entries.map((item) => item.item);
        const ratings = entries.map((item) => item.value);
        await service.bulkRate(objects, ratings);
    } else {
        const chunkSize = isPersonalMediaService(service) ? 10 : 5;
        const chunks = chunk(entries, chunkSize);
        for (const chunk of chunks) {
            await Promise.all(chunk.map((entry) => service.rate!(entry.item, entry.value)));
        }
    }
}

function findLockIndex(service: MediaService, itemType: ItemType, actionType: ActionType): number {
    return locks.findIndex(
        (lock) =>
            lock.service === service && lock.itemType === itemType && lock.actionType === actionType
    );
}

function getLock(
    service: MediaService,
    itemType: ItemType,
    actionType: ActionType
): Lock | undefined {
    const index = findLockIndex(service, itemType, actionType);
    return index == -1 ? undefined : locks[index];
}
