import AlbumType from 'types/AlbumType';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import {Logger, RateLimiter, filterNotEmpty, uniq} from 'utils';
import {
    AddMetadataOptions,
    dispatchMetadataChanges,
    filterMatches,
    findBestMatch,
} from 'services/metadata';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import MusicBrainzAlbumTracksPager from './MusicBrainzAlbumTracksPager';
import digitalFormats from './digitalFormats';

const logger = new Logger('musicbrainzApi');

interface RequestInitWithTimeout extends RequestInit {
    timeout?: number;
}

interface LookupItem<T extends MediaItem> {
    item: T;
    index: number;
}

type MBMediaItem = MediaItem & {
    musicBrainz: {
        readonly status: string;
        readonly country: string;
        readonly format: string;
        readonly primaryType: string;
        readonly secondaryType?: string;
    };
};

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
    options?: AddMetadataOptions,
    signal?: AbortSignal
): Promise<T>;
async function addMetadata<T extends MediaItem>(
    lookupItems: readonly T[],
    options?: AddMetadataOptions,
    signal?: AbortSignal
): Promise<readonly T[]>;
async function addMetadata<T extends MediaItem>(
    lookup: T | readonly T[],
    {overWrite, strictMatch}: AddMetadataOptions = {},
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
    const byISRC: LookupItem<T>[] = [];
    const bySearch: LookupItem<T>[] = [];

    for (const lookupItem of lookupItems) {
        const {recording_mbid, release_mbid, track_mbid, isrc} = lookupItem.item;
        if (recording_mbid && track_mbid && !overWrite) {
            noLookup.push(lookupItem);
        } else if (lookupItems.length === 1 && !strictMatch) {
            bySearch.push(lookupItem);
        } else if (track_mbid) {
            byTrackId.push(lookupItem);
        } else if (recording_mbid && release_mbid) {
            byRecordingId.push(lookupItem);
        } else if (strictMatch) {
            noLookup.push(lookupItem);
        } else if (lookupItems.length === 1) {
            bySearch.push(lookupItem);
        } else if (recording_mbid) {
            byRecordingId.push(lookupItem);
        } else if (isrc) {
            byISRC.push(lookupItem);
        } else {
            noLookup.push(lookupItem);
        }
    }

    try {
        const result = (
            await Promise.all([
                Promise.resolve(noLookup),
                addMetadataByTrackId(byTrackId, overWrite, requestInit),
                addMetadataByRecordingId(byRecordingId, overWrite, requestInit),
                addMetadataByISRC(byISRC, overWrite, requestInit),
                addMetadataBySearch(bySearch, overWrite, requestInit),
            ])
        ).flat();

        const foundItems = lookupItems.map(
            (lookupItem) => result.find((foundItem) => foundItem.index === lookupItem.index)!.item
        );

        return isArrayLookup ? foundItems : foundItems[0];
    } catch (err) {
        if (err !== 'Cancelled') {
            logger.error(err);
        }
        return lookup;
    }
}

async function addMetadataByTrackId<T extends MediaItem>(
    lookupItems: readonly LookupItem<T>[],
    overWrite?: boolean,
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
        const foundItem = findBestMBMatch(foundItems, item);
        if (foundItem) {
            const {artist_mbids, release_mbid, recording_mbid} = foundItem;
            const values = addMissingValues(
                {artist_mbids, release_mbid, recording_mbid},
                item,
                foundItem,
                overWrite
            );
            if (!overWrite) {
                dispatchMetadataChanges<MediaItem>({
                    match: (item) => item.track_mbid === track_mbid,
                    values,
                });
            }
            return {item: {...item, ...values}, index};
        } else {
            return lookupItem;
        }
    });
}

async function addMetadataByRecordingId<T extends MediaItem>(
    lookupItems: readonly LookupItem<T>[],
    overWrite?: boolean,
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
        const foundItem = findBestMBMatch(foundItems, item);
        if (foundItem) {
            const {artist_mbids, release_mbid, track_mbid} = foundItem;
            const values = addMissingValues(
                {artist_mbids, release_mbid, track_mbid},
                item,
                foundItem,
                overWrite
            );
            if (!overWrite) {
                dispatchMetadataChanges<MediaItem>({
                    match: (item) => item.recording_mbid === recording_mbid,
                    values,
                });
            }
            return {item: {...item, ...values}, index};
        } else {
            return lookupItem;
        }
    });
}

async function addMetadataByISRC<T extends MediaItem>(
    lookupItems: readonly LookupItem<T>[],
    overWrite?: boolean,
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
        const foundItem = findBestMBMatch(foundItems, item);
        if (foundItem) {
            const {recording_mbid, artist_mbids, release_mbid, track_mbid} = foundItem;
            const values = addMissingValues(
                {recording_mbid, artist_mbids, release_mbid, track_mbid},
                item,
                foundItem,
                overWrite
            );
            if (!overWrite) {
                dispatchMetadataChanges<MediaItem>({
                    match: (item) => item.isrc === isrc,
                    values,
                });
            }
            return {item: {...item, ...values}, index};
        } else {
            return lookupItem;
        }
    });
}

async function addMetadataBySearch<T extends MediaItem>(
    lookupItems: readonly LookupItem<T>[],
    overWrite?: boolean,
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
        const foundItem = await lookup(item, requestInit);
        if (foundItem) {
            const {recording_mbid, artist_mbids, release_mbid, track_mbid} = foundItem;
            const values = addMissingValues(
                {recording_mbid, artist_mbids, release_mbid, track_mbid},
                item,
                foundItem,
                overWrite
            );
            if (!overWrite) {
                const src = item.src;
                dispatchMetadataChanges<MediaItem>({
                    match: (item) => item.src === src,
                    values,
                });
            }
            return [{item: {...item, ...values}, index}];
        }
    }
    return lookupItems;
}

function getAlbumType(
    release_group_primary_type?: string | null,
    release_group_secondary_type?: string | null
): AlbumType | undefined {
    switch (release_group_primary_type) {
        case 'Single':
            return AlbumType.Single;

        case 'EP':
            return AlbumType.EP;

        default:
            switch (release_group_secondary_type) {
                case 'Compilation':
                    return AlbumType.Compilation;

                case 'Soundtrack':
                    return AlbumType.Soundtrack;

                case 'Live':
                    return AlbumType.LiveAlbum;
            }
    }
}

async function lookup<T extends MediaItem>(
    item: T,
    requestInit?: RequestInitWithTimeout
): Promise<MediaItem | undefined> {
    const artist = escapeQuery(item.artists?.[0] || '');
    const title = escapeQuery(item.title);
    if (artist && title) {
        const {recordings = []} = await fetchJSON<MusicBrainz.RecordingsQuery>(
            `/recording`,
            {query: `artist:${artist} AND recording:${title}`},
            requestInit
        );
        const items = createMediaItemsFromRecordings(recordings);
        return findBestMBMatch(items, item);
    }
}

async function search(
    artist: string,
    title: string,
    requestInit?: RequestInitWithTimeout
): Promise<readonly MBMediaItem[]> {
    if (artist && title) {
        artist = escapeQuery(artist);
        title = escapeQuery(title);
        const {recordings = []} = await fetchJSON<MusicBrainz.RecordingsQuery>(
            `/recording`,
            {
                query: `(artist:${artist} AND recording:${title}) OR (artist:${title} AND recording:${artist})`,
            },
            requestInit
        );
        return createMediaItemsFromRecordings(recordings);
    }
    return [];
}

// https://lucene.apache.org/core/2_9_4/queryparsersyntax.html#Escaping%20Special%20Characters
function escapeQuery(query: string): string {
    return query.replace(/[+\-!(){}[\]^"~*?:\\]|\|\||&&/g, (match: string) => {
        return match
            .split('')
            .map((char) => `\\${char}`)
            .join('');
    });
}

function addMissingValues(
    values: Partial<MediaItem>,
    item: MediaItem,
    foundItem: MediaItem,
    overWrite: boolean | undefined
): Partial<MediaItem> {
    if (overWrite) {
        // Prefer this metadata.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {src, externalUrl, playedAt, duration, ...values} = foundItem;
        (values as any).duration = duration || item.duration || 0;
        return values;
    } else {
        let {duration, track, year, isrc, albumArtist} = item;
        duration = duration || foundItem.duration;
        track = track || foundItem.track;
        year = year || foundItem.year;
        isrc = isrc || foundItem.isrc;
        albumArtist = albumArtist || foundItem.albumArtist;
        return {...values, duration, track, year, isrc, albumArtist};
    }
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

function findBestMBMatch(matches: readonly MBMediaItem[], item: MediaItem): MediaItem | undefined {
    matches = filterMatches(matches, item);
    matches = filterNotEmpty(matches, (item) => item.musicBrainz.status === 'Official');
    matches = filterNotEmpty(matches, (item) => !item.musicBrainz.secondaryType);
    matches = filterNotEmpty(matches, (item) => item.musicBrainz.primaryType === 'Album');
    matches = filterNotEmpty(matches, (item) => !!item.isrc);
    const match = findBestMatch(matches, item);
    if (match) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {musicBrainz: _, ...item} = match;
        return item;
    }
    return match;
}

function createMediaItemsFromRecordings(
    recordings: readonly MusicBrainz.Recording[]
): MBMediaItem[] {
    const items: MBMediaItem[] = [];
    for (const recording of recordings) {
        const releases = recording.releases || [];
        for (const release of releases) {
            const status = release.status || '';
            const country = release.country || '';
            const primaryType = release['release-group']?.['primary-type'] || '';
            const secondaryType = release['release-group']?.['secondary-types']?.[0];
            const media = release.media || [];
            for (const medium of media) {
                const format = medium.format || '';
                const tracks = medium.track || [];
                for (const track of tracks) {
                    const musicBrainz = {status, country, format, primaryType, secondaryType};
                    const item = createMediaItem(track, recording, release);
                    items.push({...item, musicBrainz});
                }
            }
        }
    }

    return items.sort(
        (a, b) =>
            (digitalFormats[a.musicBrainz.format] || 99) -
            (digitalFormats[b.musicBrainz.format] || 99)
    );
}

export function createMediaItem(
    track: MusicBrainz.Track,
    recording: MusicBrainz.Recording,
    release: MusicBrainz.Release
): MediaItem {
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
    findBestMatch: findBestMBMatch,
    get: fetchJSON,
    getAlbumType,
    getISRCs,
    getUrls,
    lookup,
    search,
};

export default musicbrainzApi;
