import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import {findListen} from 'services/localdb/listens';
import {getService, getLookupServices, hasPlayableSrc} from 'services/mediaServices';
import {Logger} from 'utils';
import {dispatchLookupStartEvent, dispatchLookupEndEvent} from './lookupEvents';
import lookupStore from './lookupStore';

const logger = new Logger('lookup');

export default async function lookup(item: MediaItem): Promise<MediaItem | undefined> {
    try {
        if (!item) {
            return;
        }
        if (hasPlayableSrc(item)) {
            return item;
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
    const listen = findListen(item);
    if (listen) {
        return listen;
    }
    const {link, ...rest} = item;
    if (link && hasPlayableSrc(link)) {
        return {...rest, ...link};
    }
    const {artists = [], title} = rest;
    const artist = artists[0];
    if (!artist || !title) {
        return;
    }
    let matches: readonly MediaItem[] = [];
    const [serviceId] = link?.src.split(':') || [];
    const service = getService(serviceId);
    if (service) {
        matches = await serviceLookup(service, artist, title);
    }
    if (matches.length === 0) {
        // Search logged in services first.
        matches = await multiLookup(artist, title, true, service);
    }
    if (matches.length === 0) {
        // See if we have anything stored for not logged in services.
        matches = await multiLookup(artist, title, false, service);
    }
    return findBestMatch(matches, item);
}

async function serviceLookup(
    service: MediaService,
    artist: string,
    title: string
): Promise<readonly MediaItem[]> {
    try {
        if (!service.lookup) {
            return [];
        }
        const lookup = await lookupStore.get(service.id, artist, title);
        if (lookup) {
            return lookup.items;
        }
        if (service.isLoggedIn()) {
            const matches = await service.lookup(
                removeFeaturedArtists(artist),
                removeFeaturedArtists(title),
                10,
                2000
            );
            const foundItems = findMatches(matches, artist, title);
            await lookupStore.add(service.id, artist, title, foundItems);
            return foundItems;
        }
    } catch (err) {
        logger.error(err);
    }
    return [];
}

async function multiLookup(
    artist: string,
    title: string,
    isLoggedIn: boolean,
    excludedService?: MediaService
): Promise<readonly MediaItem[]> {
    const services = getLookupServices().filter(
        (service) => service !== excludedService && service.isLoggedIn() === isLoggedIn
    );
    if (services.length === 0) {
        return [];
    } else {
        const matches = await Promise.all([
            ...services.map((service) => serviceLookup(service, artist, title)),
        ]);
        return matches.flat();
    }
}

export function findBestMatch<T extends MediaItem>(matches: readonly T[], item: T): T | undefined {
    const {artists = [], title, album = ''} = item;
    const artist = artists[0];
    if (!artist || !title) {
        return;
    }
    const foundItems = findMatches(matches, artist, title);
    return foundItems.find((item) => compareAlbum(item, album)) || foundItems[0];
}

function findMatches<T extends MediaItem>(
    matches: readonly T[],
    artist: string,
    title: string
): readonly T[] {
    let foundItems = matches.filter((match) => compare(match, artist, title, true));
    if (foundItems.length === 0) {
        foundItems = matches.filter((match) => compare(match, artist, title, false));
    }
    return foundItems;
}

const regFeaturedArtists = /\s*(feat\.|[([]?\s?feat[\s.]).*$/i;

function compare(match: MediaItem, artist: string, title: string, strict: boolean): boolean {
    return compareTitle(match, title, strict) && compareArtist(match, artist, strict);
}

function compareArtist(match: MediaItem, artist: string, strict: boolean): boolean {
    const matchedArtists = match.artists;
    if (!matchedArtists) {
        return false;
    }
    const matchedArtist = matchedArtists[0];
    if (!matchedArtist) {
        return false;
    }
    if (compareString(artist, matchedArtist)) {
        return true;
    }
    if (strict) {
        return false;
    }
    if (compareString(removeFeaturedArtists(artist), removeFeaturedArtists(matchedArtist))) {
        return true;
    }
    if (compareString(removeFeaturedArtists(artist), match.albumArtist)) {
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
        const lastMatchedArtist = matchedArtists.length > 1 ? ` & ${matchedArtists.pop()}` : '';
        const matchedTitleWithArtists = `${matchedTitle} (feat. ${matchedArtists.join(
            ', '
        )}${lastMatchedArtist})`;
        if (compareString(title, matchedTitleWithArtists)) {
            return true;
        }
    }
    if (regFeaturedArtists.test(title)) {
        const titleWithoutArtists = removeFeaturedArtists(title);
        if (compareString(titleWithoutArtists, matchedTitle)) {
            return true;
        }
    }
    if (regFeaturedArtists.test(match.title)) {
        const matchedTitleWithoutArtists = removeFeaturedArtists(matchedTitle);
        if (compareString(title, matchedTitleWithoutArtists)) {
            return true;
        }
    }
    return false;
}

function compareAlbum(match: MediaItem, album: string): boolean {
    if (!album || !match.album) {
        return false;
    }
    return compareString(normalize(album), normalize(match.album));
}

function compareString(a: string, b = ''): boolean {
    return a.localeCompare(b, undefined, {sensitivity: 'accent'}) === 0;
}

function removeFeaturedArtists(title: string): string {
    // Featured artists: `(feat. Artist1, Artist2 & Artist3)`.
    return title.replace(regFeaturedArtists, '');
}

function normalize(string: string): string {
    return string.replace(/’/g, `'`);
}
