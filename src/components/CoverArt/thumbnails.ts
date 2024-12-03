import Dexie from 'dexie';
import getYouTubeID from 'get-youtube-id';
import unidecode from 'unidecode';
import {exists} from 'utils';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import Thumbnail from 'types/Thumbnail';
import lastfmApi from 'services/lastfm/lastfmApi';
import {dispatchMediaObjectChanges} from 'services/actions/mediaObjectChanges';
import {findListenByPlayedAt, getListens} from 'services/localdb/listens';
import {getCoverArtThumbnails} from 'services/musicbrainz/coverart';
import youtubeApi from 'services/youtube/youtubeApi';

interface ThumbnailsRecord {
    album: string;
    artist: string;
    thumbnails: readonly Thumbnail[];
}

class ThumbnailsStore extends Dexie {
    readonly items!: Dexie.Table<ThumbnailsRecord, [string, string]>;

    constructor() {
        super('ampcast/thumbnails');

        this.version(1).stores({
            items: '[album+artist], thumbnails',
        });
    }
}

const store = new ThumbnailsStore();

export async function findThumbnails(
    item: MediaObject,
    extendedSearch = false,
    signal?: AbortSignal
): Promise<readonly Thumbnail[] | undefined> {
    if (!item || (item.itemType !== ItemType.Album && item.itemType !== ItemType.Media)) {
        return undefined;
    }
    if (item.itemType === ItemType.Media) {
        const externalUrl = item.link?.externalUrl;
        if (externalUrl) {
            const videoId = getYouTubeID(item.link?.externalUrl);
            if (videoId) {
                const video = await youtubeApi.getVideoInfo(videoId);
                return video.thumbnails;
            }
        }
    }
    let thumbnails = findThumbnailsInListens(item);
    if (!thumbnails) {
        let album: string | undefined;
        let artist: string | undefined;
        if (item.itemType === ItemType.Album) {
            album = item.title;
            artist = item.artist;
        } else {
            album = item.album;
            artist = item.albumArtist || item.artists?.[0];
        }
        if (!album || !artist) {
            return undefined;
        }
        const [serviceId] = item.src.split(':');
        if (extendedSearch) {
            const storedItem = await store.items.get([album, artist]);
            if (storedItem) {
                thumbnails = storedItem.thumbnails;
            } else {
                const [lastfmThumbnails, musicbrainzThumbnails] = await Promise.all([
                    lastfmApi.getThumbnails(item, signal),
                    getCoverArtThumbnails(item, true, signal),
                ]);
                thumbnails = lastfmThumbnails || musicbrainzThumbnails;
            }
        } else if (serviceId !== 'lastfm') {
            thumbnails = await getCoverArtThumbnails(item, false, signal);
        }
        if (thumbnails) {
            await store.items.put({album, artist, thumbnails});
        }
    }
    if (thumbnails) {
        const src = item.src;
        dispatchMediaObjectChanges<MediaObject>({
            match: (item) => item.src === src,
            values: {thumbnails},
        });
    }
    return thumbnails;
}

function findThumbnailsInListens(item: MediaItem | MediaAlbum): readonly Thumbnail[] | undefined {
    if (item.itemType === ItemType.Media) {
        const listen = findListenByPlayedAt(item);
        if (listen?.thumbnails) {
            return listen.thumbnails;
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
    if (!album || !artist) {
        return undefined;
    }
    const decode = (name: string) => unidecode(name).toLowerCase();
    const decodedAlbum = decode(album);
    const decodedArtist = decode(artist);
    return getListens()
        .filter(
            (listen) =>
                decode(listen.album || '') === decodedAlbum &&
                decode(listen.albumArtist || listen.artists?.[0] || '') === decodedArtist
        )
        .map((listen) => listen.thumbnails)
        .filter(exists)[0];
}
