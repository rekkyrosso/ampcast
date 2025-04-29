import getYouTubeID from 'get-youtube-id';
import unidecode from 'unidecode';
import {exists, uniqBy} from 'utils';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import Thumbnail from 'types/Thumbnail';
import lastfmApi from 'services/lastfm/lastfmApi';
import {dispatchMediaObjectChanges} from 'services/actions/mediaObjectChanges';
import {findListenByPlayedAt, getListens} from 'services/localdb/listens';
import {getCoverArtThumbnails} from 'services/musicbrainz/coverart';
import {getEnabledServices} from 'services/mediaServices';
import youtubeApi from 'services/youtube/youtubeApi';
import {getCoverArtFromBlob} from './music-metadata-js';

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
                const video = await youtubeApi.getMediaItem(videoId);
                return video.thumbnails;
            }
        }
        if (extendedSearch && item.blob) {
            const thumbnail = await getCoverArtFromBlob(item.blob);
            if (thumbnail) {
                return [thumbnail];
            }
        }
    }
    let thumbnails = findThumbnailsInListens(item);
    if (!thumbnails) {
        const [serviceId] = item.src.split(':');
        if (extendedSearch) {
            const [lastfmThumbnails, musicbrainzThumbnails] = await Promise.all([
                lastfmApi.getThumbnails(item, signal),
                getCoverArtThumbnails(item, true, signal),
            ]);
            thumbnails = lastfmThumbnails || musicbrainzThumbnails;
        } else if (serviceId !== 'lastfm') {
            thumbnails = await getCoverArtThumbnails(item, false, signal);
        }
    }
    if (thumbnails?.length === 0) {
        thumbnails = undefined;
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

export function getThumbnailUrl(thumbnail: Thumbnail): string {
    return getEnabledServices().reduce(
        (url, service) => service?.getThumbnailUrl?.(url) ?? url,
        thumbnail?.url || ''
    );
}

export function mergeThumbnails(
    {thumbnails: thumbnailsA = []}: Pick<MediaObject, 'thumbnails'> = {},
    {thumbnails: thumbnailsB = []}: Pick<MediaObject, 'thumbnails'> = {}
): readonly Thumbnail[] | undefined {
    const thumbnails = uniqBy('url', thumbnailsA.concat(thumbnailsB));
    return thumbnails.length === 0 ? undefined : thumbnails;
}

export function isSameThumbnails(
    a: readonly Thumbnail[] | undefined,
    b: readonly Thumbnail[] | undefined
): boolean {
    if (a === b) {
        return true;
    } else if (a && b && a.length === b.length) {
        const toUrl = (thumbnail: Thumbnail) => thumbnail.url;
        const urlsA = a.map(toUrl);
        const urlsB = b.map(toUrl);
        return urlsA.every((a) => urlsB.includes(a));
    } else {
        return false;
    }
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
