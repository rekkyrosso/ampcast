import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaType from 'types/MediaType';
import PlaylistItem from 'types/PlaylistItem';
import {filterNotEmpty, Logger} from 'utils';
import {findListen} from 'services/localdb/listens';
import musicbrainzApi from 'services/musicbrainz/musicbrainzApi';
import {
    getMediaLookupServices,
    getService,
    getServiceFromSrc,
    hasPlayableSrc,
    isPersonalMediaService,
    isPlayableSrc,
} from 'services/mediaServices';
import {bestOf, getArtistAndTitle, filterMatches, removeFeaturedArtists} from 'services/metadata';
import soundcloudApi from 'services/soundcloud/soundcloudApi';
import youtubeApi from 'services/youtube/youtubeApi';
import {
    dispatchLookupStartEvent,
    dispatchLookupEndEvent,
    dispatchLookupCancelledEvent,
} from './lookupEvents';
import lookupSettings from './lookupSettings';

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

    private canPlayNow({src}: {src: string}): boolean {
        return isPlayableSrc(src, true);
    }

    private async findItem(item: PlaylistItem): Promise<MediaItem | undefined> {
        const listen = this.getPlayableListen(item);
        if (listen && this.canPlayNow(listen)) {
            return listen;
        }

        const {link, ...rest} = item;
        const linkedItem = link && hasPlayableSrc(link) ? {...rest, ...link} : undefined;
        if (linkedItem && this.canPlayNow(linkedItem)) {
            const foundItem = await this.fromLinkedItem(linkedItem);
            if (foundItem) {
                return foundItem;
            }
        }

        let matches: readonly MediaItem[] = [];
        let isrcs: readonly string[] = [];

        const {artist, title} = getArtistAndTitle(item);

        if (artist && title) {
            isrcs = await this.getISRCs(item);
            const service = getServiceFromSrc(link);
            if (service) {
                matches = await this.serviceLookup(service, item, isrcs);
            }
            if (matches.length === 0 && isrcs.length > 0) {
                matches = await this.lookupByISRC(isrcs);
            }
            if (matches.length === 0) {
                matches = await this.multiServiceLookup(item, isrcs, service);
            }
        }

        matches = filterMatches(matches, item, isrcs);

        if (lookupSettings.preferPersonalMedia) {
            matches = filterNotEmpty(matches, (match) => {
                const service = getServiceFromSrc(match);
                return service ? isPersonalMediaService(service) : false;
            });
        }
        if (Lookup.lastFoundServiceId) {
            matches = filterNotEmpty(matches, (match) =>
                match.src.startsWith(`${Lookup.lastFoundServiceId}:`)
            );
        }

        const foundItem = matches[0];

        if (!foundItem) {
            const foundItemByUrl = await this.fromMusicBrainzUrls(item);
            if (foundItemByUrl) {
                return foundItemByUrl;
            }
        }

        return foundItem || listen || linkedItem;
    }

    private async fromLinkedItem(linkedItem: PlaylistItem): Promise<MediaItem | null> {
        this.throwIfCancelled();
        try {
            const src = linkedItem.src;
            const [serviceId, , id] = src.split(':');
            switch (serviceId) {
                case 'soundcloud': {
                    const track = await soundcloudApi.getMediaItem(linkedItem.externalUrl!);
                    return bestOf(track, linkedItem);
                }

                case 'youtube': {
                    linkedItem = {...linkedItem, mediaType: MediaType.Video};
                    const video = await youtubeApi.getMediaItem(id);
                    return bestOf(video, linkedItem);
                }

                default: {
                    const service = getService(serviceId);
                    if (service?.getMediaObject) {
                        const item = await service.getMediaObject<MediaItem>(src);
                        return bestOf(item, linkedItem);
                    }
                }
            }
        } catch (err) {
            logger.error(err);
            return null;
        }
        return linkedItem;
    }

    private async fromMusicBrainzUrls(item: PlaylistItem): Promise<MediaItem | undefined> {
        try {
            if (!item.recording_mbid) {
                this.throwIfCancelled();
                item = await musicbrainzApi.addMetadata(item, undefined, this.signal);
            }

            if (item.recording_mbid) {
                this.throwIfCancelled();
                const urls = await musicbrainzApi.getUrls(item.recording_mbid, this.signal);

                // MusicBrainz doesn't have many external URLs in its database.
                // They may not be 100% reliable either.
                // So just use the YouTube ones.

                this.throwIfCancelled();
                const youtubeUrl = urls.find((url) => /youtu\.?be/.test(url));
                if (youtubeUrl) {
                    const foundItem = await youtubeApi.getMediaItem(youtubeUrl);
                    if (foundItem.itemType === ItemType.Media) {
                        return foundItem;
                    }
                }
            }
        } catch (err) {
            this.throwIfCancelled();
            logger.error(err);
        }
    }

    private getPlayableListen(item: PlaylistItem): MediaItem | undefined {
        const listen = findListen(item);
        if (listen && (listen.unplayable || /^(file|blob):/.test(listen.src))) {
            return undefined;
        }
        return listen;
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
                return filterMatches(matches, item, isrcs, strict);
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
        const services = getMediaLookupServices().filter(
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
        return getMediaLookupServices().filter(
            (service) => !!service.lookupByISRC && service.isLoggedIn()
        );
    }

    private throwIfCancelled(): void {
        if (this.cancelled) {
            throw Error(this.signal.reason);
        }
    }
}
