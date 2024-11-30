import Dexie from 'dexie';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import Thumbnail from 'types/Thumbnail';
import {Logger, uniqBy} from 'utils';
import musicbrainzApi from './musicbrainzApi';

const logger = new Logger('musicbrainz/coverart');

interface CoverArt {
    mbid: string;
    album?: string;
    artist?: string;
    thumbnails?: readonly Thumbnail[] | undefined;
}

class CoverArtStore extends Dexie {
    readonly items!: Dexie.Table<CoverArt, string>;

    constructor() {
        super('ampcast/musicbrainz/coverart');

        this.version(2).stores({
            items: '&mbid, [album+artist], thumbnails',
        });
    }
}

const store = new CoverArtStore();

export async function getCoverArtThumbnails(
    item: MediaObject,
    extendedSearch = false,
    signal?: AbortSignal
): Promise<readonly Thumbnail[] | undefined> {
    if (!item || (item.itemType !== ItemType.Album && item.itemType !== ItemType.Media)) {
        return;
    }
    let hasMbidRecord = false;
    let mbid = item.caa_mbid || item.release_mbid;
    if (!mbid && extendedSearch && item.itemType === ItemType.Media) {
        item = await musicbrainzApi.addMetadata(item, false, signal);
        mbid = item.release_mbid;
    }
    if (mbid) {
        const item = await store.items.get(mbid);
        hasMbidRecord = !!item;
        if (item?.thumbnails) {
            return item.thumbnails;
        }
    }
    let album: string | undefined;
    let artist: string | undefined;
    if (item.itemType === ItemType.Album) {
        album = item.title;
        artist = item.artist;
    } else {
        album = item.album;
        artist = item.albumArtist || item.artists?.[0];
    }
    if (album && artist) {
        const storedItem = await store.items.get([album, artist]);
        if (storedItem) {
            return storedItem.thumbnails;
        }
    }
    if (!mbid || hasMbidRecord || signal?.aborted) {
        return;
    }
    try {
        const coverArt = await getCoverArt(mbid, signal);
        const frontCover = coverArt.images.filter((image) => image.front && image.approved)[0];
        const thumbnails = uniqBy(
            'url',
            frontCover
                ? Object.keys(frontCover.thumbnails)
                      .filter((size) => getImageSize(size) !== 0)
                      .map((size) => ({
                          url: frontCover.thumbnails[size],
                          width: getImageSize(size),
                          height: getImageSize(size),
                      }))
                : []
        );
        await store.items.put(thumbnails.length === 0 ? {mbid} : {mbid, album, artist, thumbnails});
        return thumbnails;
    } catch (err: any) {
        if (err.status === 404) {
            await store.items.put({mbid});
        } else {
            logger.error(err);
        }
    }
}

async function getCoverArt(mbid: string, signal?: AbortSignal): Promise<coverart.Response> {
    const response = await fetch(`https://coverartarchive.org/release/${mbid}`, {signal});
    if (!response.ok) {
        throw response;
    }
    return response.json();
}

function getImageSize(size: string): number {
    switch (size) {
        case 'small':
            return 250;

        case 'large':
            return 500;

        default:
            return Number(size) || 0;
    }
}
