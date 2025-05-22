import type {Observable} from 'rxjs';
import {BehaviorSubject, combineLatest, filter, map} from 'rxjs';
import Dexie, {liveQuery} from 'dexie';
import MediaObject from 'types/MediaObject';
import Pin, {Pinnable} from 'types/Pin';
import {dispatchMetadataChanges} from 'services/metadata';
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

    lock(pin: Pin | Pinnable): void {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {pager, parentFolder, ...lockedPin} = pin as any;
        this.lockedPin$.next(lockedPin);
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

    async pin(pinnable: Pinnable): Promise<void>;
    async pin(pinnables: readonly Pinnable[]): Promise<void>;
    async pin(pinnable: readonly Pinnable[] | Pinnable): Promise<void> {
        try {
            const pinnables: Pinnable[] = Array.isArray(pinnable) ? pinnable : [pinnable];
            await this.pins.bulkPut(
                pinnables.map((pinnable) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const {pager, parentFolder, ...pin} = pinnable as any;
                    return {...pin, isPinned: true};
                })
            );
            dispatchMetadataChanges(
                pinnables.map((pinnable) => ({
                    match: (object: MediaObject) => object.src === pinnable.src,
                    values: {isPinned: true},
                }))
            );
        } catch (err) {
            logger.error(err);
        }
    }

    async unpin(pinnable: Pinnable): Promise<void>;
    async unpin(pinnables: readonly Pinnable[]): Promise<void>;
    async unpin(pinnable: {src: string}): Promise<void>;
    async unpin(pinnable: readonly Pinnable[] | Pinnable | {src: string}): Promise<void> {
        try {
            const pinnables: {src: string}[] = Array.isArray(pinnable) ? pinnable : [pinnable];
            await this.pins.bulkDelete(pinnables.map((pinnable) => pinnable.src));
            dispatchMetadataChanges(
                pinnables.map((pinnable) => ({
                    match: (object: MediaObject) => object.src === pinnable.src,
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
