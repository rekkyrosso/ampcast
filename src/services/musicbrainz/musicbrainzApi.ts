import {Writable} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import {RateLimiter, filterNotEmpty, uniq} from 'utils';
import {findBestMatch} from 'services/lookup';
import {dispatchMediaObjectChanges} from 'services/actions/mediaObjectChanges';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import MusicBrainzAlbumTracksPager from './MusicBrainzAlbumTracksPager';
import digitalFormats from './digitalFormats';

interface RequestInitWithTimeout extends RequestInit {
    timeout?: number;
}

interface LookupItem<T extends MediaItem> {
    item: T;
    index: number;
}

const host = `https://musicbrainz.org/ws/2`;

const rateLimiter = new RateLimiter(1200, 5);

async function getISRCs<T extends MediaItem>(
    lookupItem: T,
    signal?: AbortSignal
): Promise<readonly string[]> {
    const {recording_mbid, release_mbid, track_mbid} = lookupItem;
    const requestInit: RequestInitWithTimeout = {signal, timeout: 2000};
    if (recording_mbid) {
        const {isrcs = []} = await fetchJSON<MusicBrainz.Recording>(
            `/recording/${recording_mbid}`,
            {inc: 'isrcs'},
            requestInit
        );
        return isrcs;
    } else if (track_mbid) {
        const {
            recordings: [{isrcs = []} = {}],
        } = await fetchJSON<MusicBrainz.RecordingsQuery>(
            `/recording`,
            {query: `tid:${track_mbid}`},
            requestInit
        );
        return isrcs;
    } else if (release_mbid) {
        const pager = new MusicBrainzAlbumTracksPager(release_mbid);
        const items = await fetchFirstPage(pager, requestInit);
        const item = findBestMatch(items, lookupItem);
        return item?.isrc ? [item.isrc] : [];
    } else {
        return [];
    }
}

async function getUrls(recording_mbid: string, signal?: AbortSignal): Promise<readonly string[]> {
    const requestInit: RequestInitWithTimeout = {signal, timeout: 2000};
    const recording = await fetchJSON<MusicBrainz.Recording>(
        `/recording/${recording_mbid}`,
        {inc: 'url-rels'},
        requestInit
    );
    const urls = recording.relations
        ?.filter((relation) => relation['target-type'] === 'url')
        .map((relation) => relation.url.resource)
        .filter((url) => !url.includes('google.com'));
    return urls?.length ? uniq(urls) : [];
}

async function addMetadata<T extends MediaItem>(
    lookupItem: T,
    strictMatch: boolean,
    signal?: AbortSignal
): Promise<T>;
async function addMetadata<T extends MediaItem>(
    lookupItems: readonly T[],
    strictMatch: boolean,
    signal?: AbortSignal
): Promise<readonly T[]>;
async function addMetadata<T extends MediaItem>(
    lookup: T | readonly T[],
    strictMatch: boolean,
    signal?: AbortSignal
): Promise<T | readonly T[]> {
    const requestInit: RequestInitWithTimeout = {signal, timeout: 2000};
    const isArrayLookup = Array.isArray(lookup);
    const lookupItems: LookupItem<T>[] = (isArrayLookup ? lookup : [lookup]).map((item, index) => ({
        item,
        index,
    }));
    const noLookup: LookupItem<T>[] = [];
    const byTrackId: LookupItem<T>[] = [];
    const byRecordingId: LookupItem<T>[] = [];
    const byReleaseId: LookupItem<T>[] = [];
    const byISRC: LookupItem<T>[] = [];
    const bySearch: LookupItem<T>[] = [];

    for (const lookupItem of lookupItems) {
        const {recording_mbid, release_mbid, track_mbid, isrc} = lookupItem.item;
        if (recording_mbid && release_mbid && track_mbid && isrc) {
            noLookup.push(lookupItem);
        } else if (track_mbid) {
            byTrackId.push(lookupItem);
        } else if (recording_mbid && release_mbid) {
            byRecordingId.push(lookupItem);
        } else if (strictMatch) {
            noLookup.push(lookupItem);
            // Matches are less precise below here (but still pretty good).
        } else if (recording_mbid) {
            byRecordingId.push(lookupItem);
        } else if (isrc) {
            byISRC.push(lookupItem);
        } else if (release_mbid && lookupItems.length === 1) {
            byReleaseId.push(lookupItem);
        } else {
            bySearch.push(lookupItem);
        }
    }

    const result = (
        await Promise.all([
            Promise.resolve(noLookup),
            addMetadataByTrackId(byTrackId, requestInit),
            addMetadataByRecordingId(byRecordingId, requestInit),
            addMetadataByReleaseId(byReleaseId, requestInit),
            addMetadataByISRC(byISRC, requestInit),
            addMetadataBySearch(bySearch, requestInit),
        ])
    ).flat();

    const foundItems = lookupItems.map(
        (lookupItem) => result.find((foundItem) => foundItem.index === lookupItem.index)!.item
    );

    return isArrayLookup ? foundItems : foundItems[0];
}

async function addMetadataByTrackId<T extends MediaItem>(
    lookupItems: readonly LookupItem<T>[],
    requestInit?: RequestInitWithTimeout
): Promise<readonly LookupItem<T>[]> {
    if (lookupItems.length === 0) {
        return lookupItems;
    }
    const {recordings = []} = await fetchJSON<MusicBrainz.RecordingsQuery>(
        `/recording`,
        {
            query: lookupItems
                .map((lookupItem) => `tid:${lookupItem.item.track_mbid}`)
                .join(' OR '),
            inc: 'url-rels',
        },
        requestInit
    );
    const allItems = createMediaItemsFromRecordings(recordings);
    return lookupItems.map((lookupItem) => {
        const {item, index} = lookupItem;
        const track_mbid = item.track_mbid!;
        const foundItems = allItems.filter((item) => item.track_mbid === track_mbid);
        const foundItem = findBestMatch(foundItems, item);
        if (foundItem) {
            const {artist_mbids, release_mbid, recording_mbid} = foundItem;
            const values = addMissingValues(
                {artist_mbids, release_mbid, recording_mbid},
                item,
                foundItem
            );
            dispatchMediaObjectChanges<MediaItem>({
                match: (item) => item.track_mbid === track_mbid,
                values,
            });
            return {item: {...item, ...values}, index};
        } else {
            return lookupItem;
        }
    });
}

async function addMetadataByRecordingId<T extends MediaItem>(
    lookupItems: readonly LookupItem<T>[],
    requestInit?: RequestInitWithTimeout
): Promise<readonly LookupItem<T>[]> {
    if (lookupItems.length === 0) {
        return lookupItems;
    }
    const {recordings = []} = await fetchJSON<MusicBrainz.RecordingsQuery>(
        `/recording`,
        {
            query: lookupItems
                .map((lookupItem) => `rid:${lookupItem.item.recording_mbid}`)
                .join(' OR '),
            inc: 'url-rels',
        },
        requestInit
    );
    const allItems = createMediaItemsFromRecordings(recordings);
    return lookupItems.map((lookupItem) => {
        const {item, index} = lookupItem;
        const recording_mbid = item.recording_mbid!;
        const release_mbid = item.release_mbid;
        let foundItems = allItems.filter((item) => item.recording_mbid === recording_mbid);
        foundItems = filterNotEmpty(foundItems, (item) => item.release_mbid === release_mbid);
        const foundItem = findBestMatch(foundItems, item);
        if (foundItem) {
            const {artist_mbids, release_mbid, track_mbid} = foundItem;
            const values = addMissingValues(
                {artist_mbids, release_mbid, track_mbid},
                item,
                foundItem
            );
            dispatchMediaObjectChanges<MediaItem>({
                match: (item) => item.recording_mbid === recording_mbid,
                values,
            });
            return {item: {...item, ...values}, index};
        } else {
            return lookupItem;
        }
    });
}

async function addMetadataByISRC<T extends MediaItem>(
    lookupItems: readonly LookupItem<T>[],
    requestInit?: RequestInitWithTimeout
): Promise<readonly LookupItem<T>[]> {
    if (lookupItems.length === 0) {
        return lookupItems;
    }
    const {recordings = []} = await fetchJSON<MusicBrainz.RecordingsByISRC>(
        `/recording`,
        {
            query: lookupItems.map((lookupItem) => `isrc:${lookupItem.item.isrc}`).join(' OR '),
            inc: 'url-rels',
        },
        requestInit
    );
    return lookupItems.map((lookupItem) => {
        const {item, index} = lookupItem;
        const isrc = item.isrc!;
        const foundItems = createMediaItemsFromRecordings(
            recordings.filter((recording) => recording.isrcs?.includes(isrc))
        );
        const foundItem = findBestMatch(foundItems, item);
        if (foundItem) {
            const {recording_mbid, artist_mbids, release_mbid, track_mbid} = foundItem;
            const values = addMissingValues(
                {recording_mbid, artist_mbids, release_mbid, track_mbid},
                item,
                foundItem
            );
            dispatchMediaObjectChanges<MediaItem>({
                match: (item) => item.isrc === isrc,
                values,
            });
            return {item: {...item, ...values}, index};
        } else {
            return lookupItem;
        }
    });
}

async function addMetadataByReleaseId<T extends MediaItem>(
    lookupItems: readonly LookupItem<T>[],
    requestInit?: RequestInitWithTimeout
): Promise<readonly LookupItem<T>[]> {
    // Can only do one album at once.
    if (lookupItems.length !== 1) {
        return lookupItems;
    }
    const [lookupItem] = lookupItems;
    const {item, index} = lookupItem;
    const release_mbid = item.release_mbid!;
    const recording_mbid = item.recording_mbid;
    const src = item.src;
    const pager = new MusicBrainzAlbumTracksPager(release_mbid);
    const items = await fetchFirstPage(pager, requestInit);
    const foundItem = recording_mbid
        ? items.find((item) => item.recording_mbid === recording_mbid)
        : findBestMatch(items, item);
    if (foundItem) {
        const {recording_mbid, artist_mbids, track_mbid} = foundItem;
        const values = addMissingValues(
            {recording_mbid, artist_mbids, track_mbid},
            item,
            foundItem
        );
        dispatchMediaObjectChanges<MediaItem>({
            match: (item) =>
                item.release_mbid === release_mbid &&
                (recording_mbid ? item.recording_mbid === recording_mbid : item.src === src),
            values,
        });
        return [{item: {...item, ...values}, index}];
    } else {
        return lookupItems;
    }
}

async function addMetadataBySearch<T extends MediaItem>(
    lookupItems: readonly LookupItem<T>[],
    requestInit?: RequestInitWithTimeout
): Promise<readonly LookupItem<T>[]> {
    // Can only do one item at a time.
    if (lookupItems.length !== 1) {
        return lookupItems;
    }
    const [lookupItem] = lookupItems;
    const {item, index} = lookupItem;
    const title = item.title;
    const artist = item.artists?.[0];
    if (title && artist) {
        const src = item.src;
        const foundItem = await lookup(lookupItem.item, requestInit);
        if (foundItem) {
            const {recording_mbid, artist_mbids, release_mbid, track_mbid} = foundItem;
            const values = addMissingValues(
                {recording_mbid, artist_mbids, release_mbid, track_mbid},
                item,
                foundItem
            );
            dispatchMediaObjectChanges<MediaItem>({
                match: (item) => item.src === src,
                values,
            });
            return [{item: {...item, ...values}, index}];
        }
    }
    return lookupItems;
}

async function lookup<T extends MediaItem>(
    item: T,
    requestInit?: RequestInitWithTimeout
): Promise<MediaItem | undefined> {
    const title = item.title;
    const artist = item.artists?.[0];
    const {recordings = []} = await fetchJSON<MusicBrainz.RecordingsQuery>(
        `/recording`,
        {query: `artist:${artist} AND recording:${title}`, inc: 'url-rels'},
        requestInit
    );
    const items = createMediaItemsFromRecordings(recordings);
    return findBestMatch(items, item);
}

function addMissingValues(
    values: Partial<MediaItem>,
    item: MediaItem,
    foundItem: MediaItem
): Partial<MediaItem> {
    let {duration, track, year, isrc, albumArtist} = item;
    duration = duration || foundItem.duration;
    track = track || foundItem.track;
    year = year || foundItem.year;
    isrc = isrc || foundItem.isrc;
    albumArtist = albumArtist || foundItem.albumArtist;
    return {...values, duration, track, year, isrc, albumArtist};
}

async function fetchJSON<T>(
    path: string,
    params: any = {},
    init: RequestInitWithTimeout = {}
): Promise<T> {
    if (path.startsWith('/')) {
        path = path.slice(1);
    }
    params.fmt = 'json';
    path = `${path}?${new URLSearchParams(params)}`;

    const request = new Request(`${host}/${path}`, {
        ...init,
        method: 'GET',
        headers: {
            'User-Agent': `${__app_name__}/${__app_version__} ( ${__app_contact__} )`,
        },
    });

    const response = await rateLimiter.fetch(request);

    if (!response.ok) {
        throw response;
    }

    return response.json();
}

function createMediaItemsFromRecordings(recordings: readonly MusicBrainz.Recording[]): MediaItem[] {
    type MBMediaItem = MediaItem & {
        musicBrainz: {
            readonly status: string;
            readonly country: string;
            readonly format: string;
        };
    };
    let items: MBMediaItem[] = [];
    for (const recording of recordings) {
        const releases = recording.releases || [];
        for (const release of releases) {
            const status = release.status || '';
            const country = release.country || '';
            const media = release.media || [];
            for (const medium of media) {
                const format = medium.format || '';
                const tracks = medium.track || [];
                for (const track of tracks) {
                    (track as Writable<MusicBrainz.Track>).recording = recording;
                    const musicBrainz = {status, country, format};
                    const item = createMediaItem(release, track);
                    items.push({...item, musicBrainz});
                }
            }
        }
    }
    items = filterNotEmpty(items, (item) => item.musicBrainz.status === 'Official');
    items = filterNotEmpty(items, (item) => !!item.isrc);
    items.sort(
        (a, b) =>
            (digitalFormats[a.musicBrainz.format] || 99) -
            (digitalFormats[b.musicBrainz.format] || 99)
    );

    return items.map((mbItem) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {musicBrainz: _, ...item} = mbItem;
        return item;
    });
}

export function createMediaItem(release: MusicBrainz.Release, track: MusicBrainz.Track): MediaItem {
    const recording = track.recording!;
    const [albumArtist] = getArtists(release) || [];
    const artists = getArtists(recording);

    return {
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        src: `musicbrainz:track:${track.id}`,
        externalUrl: `https://musicbrainz.org/recording/${recording.id}`,
        title: track.title,
        artists: artists?.map((artist) => artist.name),
        album: release.title,
        albumArtist: albumArtist?.name,
        duration: track.length / 1000 || 0,
        track: Number(track.number),
        recording_mbid: recording.id,
        track_mbid: track.id,
        release_mbid: release.id,
        artist_mbids: artists?.map((artist) => artist.id),
        isrc: recording.isrcs?.[0],
        year: new Date(recording['first-release-date']).getFullYear() || undefined,
        playedAt: 0,
    };
}

function getArtists(
    entity: MusicBrainz.Release | MusicBrainz.Recording
): readonly MusicBrainz.Artist[] | undefined {
    return entity['artist-credit']?.map((credit) => credit.artist);
}

const musicbrainzApi = {
    addMetadata,
    get: fetchJSON,
    getISRCs,
    getUrls,
    lookup,
};

export default musicbrainzApi;
