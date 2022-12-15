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
        if (!service.lookup) {
            return;
        }
        const lookup = await lookupStore.get(service.id, artist, title);
        if (lookup) {
            return lookup.item;
        }
        if (service.isLoggedIn()) {
            const pager = service.lookup(artist, removeFeaturedArtists(title), {
                pageSize: 10,
                maxSize: 10,
            });
            const matches = await fetchFirstPage(pager, 2000);
            let foundItem = matches.find((match) => compare(artist, title, match, true));
            if (!foundItem) {
                foundItem = matches.find((match) => compare(artist, title, match, false));
            }
            await lookupStore.add(service.id, artist, title, foundItem);
            return foundItem;
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

function compare(artist: string, title: string, match: MediaItem, strict: boolean): boolean {
    return compareTitle(title, match, strict) && compareArtists(artist, match, strict);
}

function compareArtists(artist: string, match: MediaItem, strict: boolean): boolean {
    const matchedArtists = match.artists;
    if (matchedArtists) {
        for (const matchedArtist of matchedArtists) {
            if (compareString(artist, matchedArtist)) {
                return true;
            }
            if (strict) {
                return false;
            }
        }
    }
    if (strict) {
        return false;
    }
    if (compareString(artist, match.albumArtist)) {
        return true;
    }
    const joiners = ',;&|/'
        .split('')
        .map((j) => [j, `${j} `, ` ${j} `])
        .flat();
    if (matchedArtists && matchedArtists.length > 1) {
        for (const joiner of joiners) {
            const matchedArtist = matchedArtists.join(joiner);
            if (compareString(artist, matchedArtist)) {
                return true;
            }
        }
    }
    return false;
}

function compareTitle(title: string, match: MediaItem, strict: boolean): boolean {
    if (compareString(title, match.title)) {
        return true;
    }
    const [, ...artists] = match.artists || [];
    if (artists.length > 0) {
        // Apple sometimes append `(feat. Artist1, Artist2 & Artist3)` to titles.
        const lastArtist = artists.length > 1 ? ` & ${artists.pop()}` : '';
        const matchedTitleWithArtists = `${match.title} (feat. ${artists.join(', ')}${lastArtist})`;
        if (compareString(matchedTitleWithArtists, title)) {
            return true;
        }
    }
    if (strict) {
        return false;
    }
    if (title.includes('(feat')) {
        const titleWithoutArtists = removeFeaturedArtists(title);
        if (compareString(titleWithoutArtists, match.title)) {
            return true;
        }
    }
    if (match.title.includes('(feat')) {
        const matchedTitleWithoutArtists = removeFeaturedArtists(match.title);
        if (compareString(title, matchedTitleWithoutArtists)) {
            return true;
        }
    }
    return false;
}

function compareString(a: string, b = ''): boolean {
    return a.localeCompare(b, undefined, {sensitivity: 'accent'}) === 0;
}

function removeFeaturedArtists(title: string): string {
    return title.replace(/\s*[([]feat.*$/i, '');
}
