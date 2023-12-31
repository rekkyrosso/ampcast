import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import PlaylistItem from 'types/PlaylistItem';
import {findListen} from 'services/localdb/listens';
import musicbrainzApi from 'services/musicbrainz/musicbrainzApi';
import {
    canPlayNow,
    getLookupServices,
    getService,
    getServiceFromSrc,
    hasPlayableSrc,
} from 'services/mediaServices';
import {
    dispatchLookupStartEvent,
    dispatchLookupEndEvent,
    dispatchLookupCancelledEvent,
} from './lookupEvents';
import {findBestMatch, findMatches, getArtistAndTitle, removeFeaturedArtists} from './matcher';
import {Logger} from 'utils';

const logger = new Logger('lookup');

export default async function lookup<T extends PlaylistItem>(
    item: T
): Promise<MediaItem | undefined> {
    if (!item) {
        return;
    }
    if (hasPlayableSrc(item)) {
        return item;
    }
    const currentLookup = Lookup.current;
    if (currentLookup?.item.id === item.id) {
        return currentLookup.promise;
    } else {
        return new Lookup(item).find();
    }
}

class Lookup {
    static current: Lookup | null = null;
    private static lastFoundServiceId = '';
    private readonly controller = new AbortController();
    #promise: Promise<MediaItem | undefined> | undefined = undefined;

    constructor(readonly item: PlaylistItem) {
        // Only one lookup at a time to avoid bottlenecks.
        if (Lookup.current) {
            Lookup.current.cancel();
        }
        Lookup.current = this;
    }

    get cancelled(): boolean {
        return this.signal.aborted;
    }

    get promise(): Promise<MediaItem | undefined> | undefined {
        return this.#promise;
    }

    cancel(): void {
        this.controller.abort('Cancelled');
    }

    async find(): Promise<MediaItem | undefined> {
        const lookupItem = this.item;
        let foundItem: MediaItem | undefined;
        dispatchLookupStartEvent(lookupItem);
        try {
            this.#promise = this.findItem(lookupItem);
            foundItem = await this.#promise;
            if (foundItem) {
                [Lookup.lastFoundServiceId] = foundItem.src.split(':');
            }
        } catch (err) {
            if (!this.cancelled) {
                logger.error(err);
            }
        }
        if (!foundItem && this.cancelled) {
            dispatchLookupCancelledEvent(lookupItem);
        } else {
            dispatchLookupEndEvent(lookupItem, foundItem);
        }
        if (Lookup.current === this) {
            Lookup.current = null;
        }
        return foundItem;
    }

    private get signal(): AbortSignal {
        return this.controller.signal;
    }

    private async findItem(item: PlaylistItem): Promise<MediaItem | undefined> {
        const listen = findListen(item);
        if (listen && canPlayNow(listen)) {
            return listen;
        }

        const {link, ...rest} = item;
        const linkedItem = link && hasPlayableSrc(link) ? {...rest, ...link} : undefined;
        // TODO: Enhance linked item from original source.
        if (linkedItem && canPlayNow(linkedItem)) {
            return linkedItem;
        }

        let matches: readonly MediaItem[] = [];
        let isrcs: readonly string[] = [];

        const {artist, title} = getArtistAndTitle(item);

        if (artist && title) {
            isrcs = await this.getISRCs(item);
            const service = getServiceFromSrc(link);
            if (service) {
                matches = await this.serviceLookup(service, item, isrcs);
                if (matches.length === 0 && (service.id === 'plex' || service.id === 'tidal')) {
                    const plexTidal = getService('plex-tidal');
                    if (plexTidal) {
                        matches = await this.serviceLookup(plexTidal, item, isrcs);
                    }
                }
            }
            if (matches.length === 0 && isrcs.length > 0) {
                matches = await this.lookupByISRC(isrcs);
            }
            if (matches.length === 0) {
                matches = await this.multiServiceLookup(item, isrcs, service);
            }
        }

        return (
            findBestMatch(matches, item, isrcs, Lookup.lastFoundServiceId) || listen || linkedItem
        );
    }

    private async serviceLookup(
        service: MediaService,
        item: PlaylistItem,
        isrcs: readonly string[],
        strict?: boolean
    ): Promise<readonly MediaItem[]> {
        this.throwIfCancelled();
        try {
            if (service.lookup && service.isLoggedIn()) {
                const {artist, title} = getArtistAndTitle(item);
                const searchString = (q: string): string =>
                    String(q)
                        .replace(/[([{}].*$/, '')
                        .replace(/['"]/g, ' ')
                        .replace(/\s\s+/g, ' ');
                const matches = await service.lookup(
                    searchString(item.albumArtist || removeFeaturedArtists(artist)),
                    searchString(removeFeaturedArtists(title)),
                    10,
                    2000
                );
                return findMatches(matches, item, isrcs, strict);
            }
        } catch (err) {
            logger.error(err);
        }
        return [];
    }

    private async multiServiceLookup(
        item: PlaylistItem,
        isrcs: readonly string[],
        excludedService?: MediaService
    ): Promise<readonly MediaItem[]> {
        this.throwIfCancelled();
        const services = getLookupServices().filter(
            (service) => service !== excludedService && service.isLoggedIn()
        );
        if (services.length === 0) {
            return [];
        } else {
            const matches = await Promise.all([
                ...services.map((service) => this.serviceLookup(service, item, isrcs)),
            ]);
            return matches.flat();
        }
    }

    private async lookupByISRC(isrcs: readonly string[]): Promise<readonly MediaItem[]> {
        this.throwIfCancelled();
        const services = this.getISRCServices();
        if (services.length === 0) {
            return [];
        } else {
            const matches = await Promise.all([
                ...services.map((service) => service.lookupByISRC!(isrcs, 10, 2000)),
            ]);
            return matches.flat();
        }
    }

    private async getISRCs(item: PlaylistItem): Promise<readonly string[]> {
        if (item.isrc) {
            return [item.isrc];
        } else if (this.getISRCServices().length > 0) {
            try {
                const isrcs = await musicbrainzApi.getISRCs(item, this.signal);
                return isrcs;
            } catch (err) {
                logger.error(err);
            }
        }
        return [];
    }

    private getISRCServices(): readonly MediaService[] {
        return getLookupServices().filter(
            (service) => !!service.lookupByISRC && service.isLoggedIn()
        );
    }

    private throwIfCancelled(): void {
        if (this.cancelled) {
            throw Error(this.signal.reason);
        }
    }
}
