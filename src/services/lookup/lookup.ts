import {from, merge} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import {getService, getLookupServices} from 'services/mediaServices';
import {hasPlayableSrc} from 'services/mediaServices';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import {exists, Logger} from 'utils';
import lookupStore from './lookupStore';
import {dispatchLookupEvent} from './lookupEvents';

const logger = new Logger('lookup');

export default async function lookup(item: MediaItem): Promise<MediaItem | undefined> {
    try {
        if (!item) {
            return;
        }
        if (hasPlayableSrc(item)) {
            return item;
        }
        const {link, artists, title} = item;
        const artist = artists?.[0];
        if (!artist || !title) {
            return;
        }
        let foundItem: MediaItem | undefined;
        const [serviceId] = link?.src.split(':') || [];
        const service = getService(serviceId);
        if (service) {
            foundItem = await serviceLookup(service, artist, title);
        }
        if (!foundItem) {
            foundItem = await multiLookup(artist, title, true, service);
        }
        if (!foundItem) {
            foundItem = await multiLookup(artist, title, false, service);
        }
        if (foundItem) {
            dispatchLookupEvent(item, foundItem);
        }
        return foundItem;
    } catch (err) {
        logger.error(err);
    }
}

async function serviceLookup(
    service: MediaService,
    artist: string,
    title: string
): Promise<MediaItem | undefined> {
    try {
        const lookup = await lookupStore.get(service.id, artist, title);
        if (lookup) {
            return lookup.item;
        }
        if (service.lookup && service.isLoggedIn()) {
            const pager = service.lookup(artist, title, {pageSize: 10, maxSize: 10});
            const matches = await fetchFirstPage(pager, 2000);
            const item = matches.find(
                (match) => compareString(title, match.title) && compareArtist(artist, match.artists)
            );
            await lookupStore.add(service.id, artist, title, item);
            return item;
        }
    } catch (err) {
        logger.error(err);
    }
}

async function multiLookup(
    artist: string,
    title: string,
    isLoggedIn: boolean,
    excludedService?: MediaService
): Promise<MediaItem | undefined> {
    return new Promise((resolve, reject) => {
        const services = getLookupServices().filter(
            (service) => service !== excludedService && service.isLoggedIn() === isLoggedIn
        );
        if (services.length === 0) {
            resolve(undefined);
        } else {
            merge(...services.map((service) => from(serviceLookup(service, artist, title))))
                .pipe(take(services.length), filter(exists), take(1))
                .subscribe({
                    next: resolve,
                    complete: () => resolve(undefined),
                    error: reject,
                });
        }
    });
}

function compareString(a: string, b = ''): boolean {
    return a.localeCompare(b, undefined, {sensitivity: 'accent'}) === 0;
}

function compareArtist(artist: string, matchedArtists: readonly string[] | undefined): boolean {
    if (matchedArtists) {
        for (const matchedArtist of matchedArtists) {
            if (compareString(artist, matchedArtist)) {
                return true;
            }
        }
    }
    return false;
}
