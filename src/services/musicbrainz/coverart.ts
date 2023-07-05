import Dexie from 'dexie';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import Thumbnail from 'types/Thumbnail';
import {Logger} from 'utils';

console.log('module:musicbrainz/coverart');

const logger = new Logger('musicbrainz/coverart');

interface CoverArt {
    mbid: string;
    album?: string;
    artist?: string;
    thumbnails?: Thumbnail[] | undefined;
}

class CoverArtStore extends Dexie {
    readonly items!: Dexie.Table<CoverArt, string>;

    constructor() {
        super('ampcast/musicbrainz/coverart');

        this.version(2).stores({
            items: `&mbid, [album+artist], thumbnails`,
        });
    }
}

const store = new CoverArtStore();

export async function getCoverArtThumbnails(item: MediaObject): Promise<Thumbnail[] | undefined> {
    if (!item || (item.itemType !== ItemType.Album && item.itemType !== ItemType.Media)) {
        return;
    }
    let hasMbidRecord = false;
    const mbid = item.release_mbid;
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
        const item = await store.items.get({album, artist});
        if (item) {
            return item.thumbnails;
        }
    }
    if (!mbid || hasMbidRecord) {
        return;
    }
    try {
        const coverArt = await getCoverArt(mbid);
        const frontCover = coverArt.images.filter((image) => image.front && image.approved)[0];
        const thumbnails = frontCover
            ? Object.keys(frontCover.thumbnails)
                  .filter((size) => getImageSize(size) !== 0)
                  .map((size) => ({
                      url: frontCover.thumbnails[size],
                      width: getImageSize(size),
                      height: getImageSize(size),
                  }))
            : [];
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

async function getCoverArt(mbid: string): Promise<coverart.Response> {
    const response = await fetch(`https://coverartarchive.org/release/${mbid}`);
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
