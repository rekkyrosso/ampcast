import unidecode from 'unidecode';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import PlaylistItem from 'types/PlaylistItem';
import {findListen} from 'services/localdb/listens';
import musicbrainzApi from 'services/musicbrainz/musicbrainzApi';
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

export default async function lookup<T extends PlaylistItem>(
    item: T
): Promise<MediaItem | undefined> {
    if (!item) {
        return;
    }
    if (hasPlayableSrc(item)) {
        return item;
    }
    let foundItem: MediaItem | undefined;
    dispatchLookupStartEvent(item);
    try {
        foundItem = await lookupMediaItem(item);
        if (foundItem) {
            [lastFoundServiceId] = foundItem.src.split(':');
        }
    } catch (err) {
        logger.error(err);
    }
    dispatchLookupEndEvent(item, foundItem);
    return foundItem;
}

async function lookupMediaItem<T extends PlaylistItem>(item: T): Promise<MediaItem | undefined> {
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
    let isrcs: readonly string[] = [];

    if (item.recording_mbid || (item.release_mbid && item.track_mbid)) {
        isrcs = await musicbrainzApi.getISRCs(item);
    }

    const {artist, title} = getArtistAndTitle(item);
    if (artist && title) {
        const service = getServiceFromSrc(link);
        if (service) {
            matches = await serviceLookup(service, item, isrcs);
            if (matches.length === 0 && (service.id === 'plex' || service.id === 'tidal')) {
                const plexTidal = getService('plex-tidal');
                if (plexTidal) {
                    matches = await serviceLookup(plexTidal, item, isrcs);
                }
            }
        }
        if (matches.length === 0) {
            matches = await multiLookup(item, isrcs, service);
        }
    }

    return findBestMatch(matches, item, isrcs) || listen || linkedItem;
}

async function serviceLookup<T extends PlaylistItem>(
    service: MediaService,
    item: T,
    isrcs: readonly string[]
): Promise<readonly MediaItem[]> {
    try {
        if (!service.lookup) {
            return [];
        }
        const {artist, title} = getArtistAndTitle(item);
        if (service.isLoggedIn()) {
            const searchString = (q: string): string =>
                String(q)
                    .replace(/[([].*$/, '')
                    .replace(/['"]/g, ' ')
                    .replace(/\s\s+/g, ' ');

            const matches = await service.lookup(
                searchString(item.albumArtist || removeFeaturedArtists(artist)),
                searchString(removeFeaturedArtists(title)),
                10,
                2000
            );
            return findMatches(matches, item, isrcs);
        }
    } catch (err) {
        logger.error(err);
    }
    return [];
}

async function multiLookup<T extends PlaylistItem>(
    item: T,
    isrcs: readonly string[],
    excludedService?: MediaService
): Promise<readonly MediaItem[]> {
    const services = getLookupServices().filter(
        (service) => service !== excludedService && service.isLoggedIn()
    );
    if (services.length === 0) {
        return [];
    } else {
        const matches = await Promise.all([
            ...services.map((service) => serviceLookup(service, item, isrcs)),
        ]);
        return matches.flat();
    }
}

export function findBestMatch<T extends MediaItem>(
    items: readonly MediaItem[],
    item: T,
    isrcs: readonly string[] = []
): MediaItem | undefined {
    const {artist, title} = getArtistAndTitle(item);
    if (!artist || !title) {
        return;
    }
    let matches = findMatches(items, item, isrcs);
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

function findMatches<T extends MediaItem>(
    items: readonly MediaItem[],
    item: T,
    isrcs: readonly string[]
): MediaItem[] {
    let matches: MediaItem[] = [];
    if (isrcs.length > 0) {
        matches = items.filter((match) => match.isrc && isrcs.includes(match.isrc));
    }
    if (matches.length === 0) {
        matches = items.filter((match) => compare(match, item, true));
    }
    if (matches.length === 0) {
        matches = items.filter((match) => compare(match, item, false));
    }
    return matches;
}

const regFeaturedArtists = /\s*(feat\.|ft\.|[([]?\s?(feat|ft)[\s.]).*$/i;

function compare<T extends MediaItem>(match: MediaItem, item: T, strict: boolean): boolean {
    if (compareByUniqueId(match, item)) {
        return true;
    }
    return (
        compareArtist(match, item, strict) &&
        (compareTitle(match, item, strict) || compareAlbumTrack(match, item))
    );
}

function compareByUniqueId<T extends MediaItem>(match: MediaItem, item: T): boolean {
    return !!(
        (item.isrc && item.isrc === match.isrc) ||
        (item.recording_mbid && item.recording_mbid === match.recording_mbid) ||
        (item.track_mbid &&
            item.release_mbid === match.release_mbid &&
            item.track_mbid === match.track_mbid)
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
    if (compareMultiArtist(match, item)) {
        return true;
    }
    return false;
}

function compareMultiArtist<T extends MediaItem>(match: MediaItem, item: T): boolean {
    const artists = splitArtists(item.artists!);
    const matchedArtists = splitArtists(match.artists!);
    if (matchedArtists.length > 1 || artists.length > 1) {
        return (
            artists.filter((artist) =>
                matchedArtists.find((match) => compareString(normalize(artist), normalize(match)))
            ).length > 0
        );
    }
    return false;
}

function splitArtists(artists: readonly string[]): readonly string[] {
    return artists.join('|').split(/\s*[,;&|/×]\s*/);
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
    const title = item.title;
    if (!title) {
        return false;
    }
    if (compareString(title, match.title)) {
        return true;
    }
    if (strict) {
        return false;
    }
    if (compareTitleStrings(match, match.title, title)) {
        return true;
    }
    if (compareTitleStrings(match, trimTrackTitle(match.title), trimTrackTitle(title))) {
        return true;
    }
    return false;
}

function compareTitleStrings(match: MediaItem, matchedTitle: string, title: string): boolean {
    matchedTitle = normalize(matchedTitle);
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

function trimTrackTitle(title: string): string {
    // Remove remaster tags.
    // e.g. "Disorder (2007 Remaster)" => "Disorder"
    title = title.replace(/\s*\((19|20)\d\d(\sDigital)?\sRemaster\)$/gi, '');
    // Remove album/single version.
    // e.g. "Disorder (Single Version)" => "Disorder"
    // e.g. "Disorder - Single Version" => "Disorder"
    title = title.replace(/\s*\((Album|Single)(\s+Version)?\)$/gi, '');
    title = title.replace(/\s*-\s*(Album|Single)(\s+Version)?$/gi, '');
    return title;
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
