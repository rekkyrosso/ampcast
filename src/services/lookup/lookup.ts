import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import {getService, getLookupServices} from 'services/mediaServices';
import {hasPlayableSrc} from 'services/mediaServices';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import {exists, Logger} from 'utils';
import {dispatchLookupStartEvent, dispatchLookupEndEvent} from './lookupEvents';
import lookupStore from './lookupStore';

const logger = new Logger('lookup');

export default async function lookup(item: MediaItem): Promise<MediaItem | undefined> {
    try {
        if (!item) {
            return;
        }
        dispatchLookupStartEvent(item);
        const foundItem = await lookupMediaItem(item);
        dispatchLookupEndEvent(item, foundItem);
        return foundItem;
    } catch (err) {
        logger.error(err);
    }
}

async function lookupMediaItem(item: MediaItem): Promise<MediaItem | undefined> {
    if (hasPlayableSrc(item)) {
        return item;
    }
    const {link, artists = [], title} = item;
    const artist = artists[0];
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
        // Search logged in services first.
        foundItem = await multiLookup(artist, title, true, service);
    }
    if (!foundItem) {
        // See if we have anything stored for not logged in services.
        foundItem = await multiLookup(artist, title, false, service);
    }
    return foundItem;
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
            const foundItem = findBestMatch(matches, artist, title);
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
    const services = getLookupServices().filter(
        (service) => service !== excludedService && service.isLoggedIn() === isLoggedIn
    );
    if (services.length === 0) {
        return;
    } else {
        const matches = await Promise.all([
            ...services.map((service) => serviceLookup(service, artist, title)),
        ]);
        // Shuffle the results to make them a bit fairer
        return findBestMatch(matches.filter(exists), artist, title);
    }
}

export function findBestMatch<T extends MediaItem>(matches: readonly T[], item: T): T | undefined;
export function findBestMatch<T extends MediaItem>(
    matches: readonly T[],
    artist: string,
    title: string
): T | undefined;
export function findBestMatch<T extends MediaItem>(
    matches: readonly T[],
    item: string | T,
    title = ''
): T | undefined {
    if (!item || matches.length === 0) {
        return;
    }
    let artist: string;
    if (typeof item === 'string') {
        artist = item;
    } else {
        artist = item.artists?.[0] || '';
        title = item.title;
    }
    if (!artist || !title) {
        return;
    }
    let foundItem = matches.find((match) => compare(match, artist, title, true));
    if (!foundItem) {
        foundItem = matches.find((match) => compare(match, artist, title, false));
    }
    return foundItem;
}

function compare(match: MediaItem, artist: string, title: string, strict: boolean): boolean {
    return compareTitle(match, title, strict) && compareArtist(match, artist, strict);
}

function compareArtist(match: MediaItem, artist: string, strict: boolean): boolean {
    const matchedArtists = match.artists;
    if (!matchedArtists?.[0]) {
        return false;
    }
    if (compareString(artist, matchedArtists[0])) {
        return true;
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
    for (const joiner of joiners) {
        const [matchedArtist] = matchedArtists[0].split(joiner);
        if (compareString(artist, matchedArtist)) {
            return true;
        }
        if (matchedArtists.length > 1) {
            const matchedArtist = matchedArtists.join(joiner);
            if (compareString(artist, matchedArtist)) {
                return true;
            }
        }
    }
    return false;
}

function compareTitle(match: MediaItem, title: string, strict: boolean): boolean {
    const matchedTitle = normalize(match.title);
    title = normalize(title);
    if (compareString(title, matchedTitle)) {
        return true;
    }
    if (strict) {
        return false;
    }
    const [, ...matchedArtists] = match.artists || [];
    if (matchedArtists.length > 0) {
        // Featured artists: `(feat. Artist1, Artist2 & Artist3)`.
        const lastMatchedArtist = matchedArtists.length > 1 ? ` & ${matchedArtists.pop()}` : '';
        const matchedTitleWithArtists = `${matchedTitle} (feat. ${matchedArtists.join(
            ', '
        )}${lastMatchedArtist})`;
        if (compareString(title, matchedTitleWithArtists)) {
            return true;
        }
    }
    if (title.includes('(feat')) {
        const titleWithoutArtists = removeFeaturedArtists(title);
        if (compareString(titleWithoutArtists, matchedTitle)) {
            return true;
        }
    }
    if (match.title.includes('(feat')) {
        const matchedTitleWithoutArtists = removeFeaturedArtists(matchedTitle);
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

function normalize(string: string): string {
    return string.replace(/’/g, `'`);
}
