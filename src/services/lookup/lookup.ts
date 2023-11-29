import unidecode from 'unidecode';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import {findListen} from 'services/localdb/listens';
import {
    getLookupServices,
    getService,
    getServiceFromSrc,
    hasPlayableSrc,
    isAlwaysPlayableSrc,
    isPersonalMediaService,
} from 'services/mediaServices';
import {filterNotEmpty, fuzzyCompare, Logger} from 'utils';
import {dispatchLookupStartEvent, dispatchLookupEndEvent} from './lookupEvents';
import lookupSettings from './lookupSettings';

const logger = new Logger('lookup');

let lastFoundServiceId = '';

export default async function lookup<T extends MediaItem>(item: T): Promise<MediaItem | undefined> {
    try {
        if (!item) {
            return;
        }
        if (hasPlayableSrc(item)) {
            return item;
        }
        dispatchLookupStartEvent(item);
        const foundItem = await lookupMediaItem(item);
        if (foundItem) {
            [lastFoundServiceId] = foundItem.src.split(':');
        }
        dispatchLookupEndEvent(item, foundItem);
        return foundItem;
    } catch (err) {
        logger.error(err);
    }
}

async function lookupMediaItem<T extends MediaItem>(item: T): Promise<MediaItem | undefined> {
    const listen = findListen(item);
    if (listen) {
        if (canPlayNow(listen)) {
            return listen;
        }
    }

    const {link, ...rest} = item;
    const linkedItem = link && hasPlayableSrc(link) ? {...rest, ...link} : undefined;
    if (linkedItem) {
        if (canPlayNow(linkedItem)) {
            return linkedItem;
        }
    }

    let matches: readonly MediaItem[] = [];

    const {artist, title} = getArtistAndTitle(item);
    if (artist && title) {
        const service = getServiceFromSrc(link);
        if (service) {
            matches = await serviceLookup(service, item);
            if (matches.length === 0 && (service.id === 'plex' || service.id === 'tidal')) {
                const plexTidal = getService('plex-tidal');
                if (plexTidal) {
                    matches = await serviceLookup(plexTidal, item);
                }
            }
        }
        if (matches.length === 0) {
            matches = await multiLookup(item, service);
        }
    }

    return findBestMatch(matches, item) || listen || linkedItem;
}

function canPlayNow<T extends MediaItem>(item: T): boolean {
    if (isAlwaysPlayableSrc(item.src)) {
        return true;
    }
    const service = getServiceFromSrc(item);
    if (service?.isLoggedIn()) {
        return true;
    }
    return false;
}

async function serviceLookup<T extends MediaItem>(
    service: MediaService,
    item: T
): Promise<readonly MediaItem[]> {
    try {
        if (!service.lookup) {
            return [];
        }
        const {artist, title} = getArtistAndTitle(item);
        if (service.isLoggedIn()) {
            const searchString = (q: string): string =>
                normalize(q)
                    .replace(/[([].*$/, '')
                    .replace(/['"]/g, ' ')
                    .replace(/\s\s+/g, ' ');

            const matches = await service.lookup(
                searchString(item.albumArtist || removeFeaturedArtists(artist)),
                searchString(removeFeaturedArtists(title)),
                10,
                2000
            );
            return findMatches(matches, item);
        }
    } catch (err) {
        logger.error(err);
    }
    return [];
}

async function multiLookup<T extends MediaItem>(
    item: T,
    excludedService?: MediaService
): Promise<readonly MediaItem[]> {
    const services = getLookupServices().filter(
        (service) => service !== excludedService && service.isLoggedIn()
    );
    if (services.length === 0) {
        return [];
    } else {
        const matches = await Promise.all([
            ...services.map((service) => serviceLookup(service, item)),
        ]);
        return matches.flat();
    }
}

export function findBestMatch<T extends MediaItem>(
    items: readonly MediaItem[],
    item: T
): MediaItem | undefined {
    const {artist, title} = getArtistAndTitle(item);
    if (!artist || !title) {
        return;
    }
    let matches = findMatches(items, item);
    matches = filterNotEmpty(matches, (match) => compareAlbum(match, item));
    if (lookupSettings.preferPersonalMedia) {
        matches = filterNotEmpty(matches, (match) => {
            const service = getServiceFromSrc(match);
            return service ? isPersonalMediaService(service) : false;
        });
    }
    if (lastFoundServiceId) {
        matches = filterNotEmpty(matches, (match) => match.src.startsWith(lastFoundServiceId));
    }
    return matches[0];
}

function findMatches<T extends MediaItem>(items: readonly MediaItem[], item: T): MediaItem[] {
    let matches = items.filter((match) => compare(match, item, true));
    if (matches.length === 0) {
        matches = items.filter((match) => compare(match, item, false));
    }
    return matches;
}

const regFeaturedArtists = /\s*(feat\.|[([]?\s?feat[\s.]).*$/i;

function compare<T extends MediaItem>(match: MediaItem, item: T, strict: boolean): boolean {
    return (
        (compareTitle(match, item, strict) || compareAlbumTrack(match, item)) &&
        compareArtist(match, item, strict)
    );
}

function compareArtist<T extends MediaItem>(match: MediaItem, item: T, strict: boolean): boolean {
    const artist = item.artists?.[0];
    if (!artist) {
        return false;
    }
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
    if (compareString(normalize(artist), normalize(matchedArtist))) {
        return true;
    }
    if (compareString(removeFeaturedArtists(artist), removeFeaturedArtists(matchedArtist))) {
        return true;
    }
    const albumArtist = item.albumArtist;
    if (albumArtist && compareString(normalize(albumArtist), normalize(matchedArtist))) {
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

function compareAlbumTrack<T extends MediaItem>(match: MediaItem, item: T): boolean {
    if (!compareAlbum(match, item)) {
        return false;
    }
    if (match.track !== item.track) {
        return false;
    }
    const a = normalize(match.title);
    const b = normalize(item.title);
    if (a.startsWith(b) || b.startsWith(a)) {
        return true;
    }
    return fuzzyCompare(a, b, 0.75);
}

function compareTitle<T extends MediaItem>(match: MediaItem, item: T, strict: boolean): boolean {
    let title = item.title;
    if (!title) {
        return false;
    }
    if (compareString(title, match.title)) {
        return true;
    }
    if (strict) {
        return false;
    }
    const matchedTitle = normalize(match.title);
    title = normalize(title);
    if (compareString(title, matchedTitle)) {
        return true;
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

function compareAlbum<T extends MediaItem>(match: MediaItem, item: T): boolean {
    if (!match.album || !item.album) {
        return false;
    }
    return compareString(normalize(item.album), normalize(match.album));
}

function compareString(a: string, b = ''): boolean {
    return a.localeCompare(b, undefined, {sensitivity: 'accent'}) === 0;
}

function normalize(string: string): string {
    return unidecode(string).replace(/\s\s+/g, ' ');
}

function getArtistAndTitle<T extends MediaItem>(item: T): {artist: string; title: string} {
    const artist = item.artists ? item.artists[0] || '' : '';
    return {artist, title: item.title};
}

function removeFeaturedArtists(title: string): string {
    // Featured artists: `(feat. Artist1, Artist2 & Artist3)`.
    return title.replace(regFeaturedArtists, '');
}
