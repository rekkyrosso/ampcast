import Dexie from 'dexie';
import MediaObject from 'types/MediaObject';
import Thumbnail from 'types/Thumbnail';
import {Logger} from 'utils';

console.log('module:localdb/coverart');

const logger = new Logger('localdb/coverart');

interface CoverArt {
    mbid: string;
    thumbnails?: Thumbnail[] | undefined;
}

class CoverArtStore extends Dexie {
    readonly items!: Dexie.Table<CoverArt, string>;

    constructor() {
        super('ampcast/coverart');

        this.version(1).stores({
            items: `&mbid, thumbnails`,
        });
    }
}

const store = new CoverArtStore();

export async function getCoverArtThumbnails(mbid: string): Promise<Thumbnail[] | undefined>;
export async function getCoverArtThumbnails(item: MediaObject): Promise<Thumbnail[] | undefined>;
export async function getCoverArtThumbnails(
    mbid: string | MediaObject
): Promise<Thumbnail[] | undefined> {
    if (typeof mbid === 'object') {
        mbid = mbid.release_mbid || '';
    }
    if (!mbid) {
        return;
    }
    const coverArt = await store.items.get(mbid);
    if (coverArt) {
        return coverArt.thumbnails;
    }
    try {
        const coverArt = await getCoverArt(mbid);
        logger.log('coverArt', {mbid, coverArt});
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
        await store.items.put(thumbnails.length === 0 ? {mbid} : {mbid, thumbnails});
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
