import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import RadioStation from 'types/RadioStation';
import {getHeaders, playlistContentTypes, uniq} from 'utils';
import {MAX_DURATION} from 'services/constants';
import {parsePlaylistFromUrl} from 'services/mediaPlayback/players/playlistParser';
import lastfmApi from 'services/lastfm/lastfmApi';
import mixcloudApi from 'services/mixcloud/mixcloudApi';
import musicbrainzApi from 'services/musicbrainz/musicbrainzApi';
import soundcloudApi from 'services/soundcloud/soundcloudApi';
import youtubeApi from 'services/youtube/youtubeApi';
import musicMetadataJs from './music-metadata-js';
import {mergeThumbnails} from './thumbnails';

export interface AddMetadataOptions {
    overWrite?: boolean;
    strictMatch?: boolean;
}

export async function addMetadata<T extends MediaItem>(item: T, overWrite = false): Promise<T> {
    let foundItem: MediaItem | undefined;
    if (overWrite) {
        const lastfmItem = await lastfmApi.addMetadata(item, {overWrite: true});
        // console.log({lastfmItem});
        if (lastfmItem === item) {
            // Not enhanced (same item).
            const musicbrainzItem = await musicbrainzApi.addMetadata(item, {overWrite: true});
            // console.log({musicbrainzItem});
            if (musicbrainzItem !== item) {
                foundItem = musicbrainzItem;
            }
        } else {
            foundItem = await musicbrainzApi.addMetadata(lastfmItem, {overWrite: false});
        }
    } else {
        foundItem = await musicbrainzApi.addMetadata(item, {overWrite: false});
    }
    // console.log({foundItem});
    if (foundItem && foundItem !== item) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {src, externalUrl, playedAt, ...values} = foundItem;
        const resultItem = bestOf(values as T, item);
        // Prefer `duration` provided by source.
        return {...resultItem, duration: item.duration || foundItem.duration};
    }
    return item;
}

export function bestOf<T extends MediaObject>(a: T, b: Partial<T> = {}): T {
    const keys = uniq(Object.keys(a).concat(Object.keys(b))) as (keyof T)[];
    const result: any = keys.reduce<T>((result: T, key: keyof T) => {
        if (a[key] !== undefined) {
            result[key] = a[key];
        } else if (b[key] !== undefined) {
            result[key] = b[key]!;
        }
        return result;
    }, {} as T);
    result.thumbnails = mergeThumbnails(a, b);
    if (a.itemType === ItemType.Media) {
        result.duration = a.duration || (b as any).duration || 0;
        // Don't set album details if albums don't match.
        if (a.album !== (b as any).album) {
            if (a.album) {
                result.albumArtist = a.albumArtist;
                result.track = a.track;
            } else {
                result.albumArtist = (b as any).albumArtist;
                result.track = (b as any).track;
            }
        }
    }
    return result;
}

export async function createMediaItemFromFile(file: File): Promise<MediaItem> {
    return musicMetadataJs.createMediaItemFromFile(file);
}

export async function createMediaItemFromUrl(url: string): Promise<MediaItem> {
    const {hostname} = new URL(url);
    if (hostname.includes('mixcloud.com')) {
        return mixcloudApi.getMediaItem(url);
    } else if (hostname.includes('soundcloud.com')) {
        return soundcloudApi.getMediaItem(url);
    } else if (/youtu\.?be/.test(hostname)) {
        return youtubeApi.getMediaItem(url);
    } else {
        try {
            const headers = await getHeaders(url);
            if (headers.get('icy-name') || headers.get('icy-url')) {
                return createMediaItemFromIcecastHeaders(url, headers);
            } else {
                const contentType = headers.get('content-type')?.toLowerCase() || '';
                if (playlistContentTypes.includes(contentType)) {
                    return createMediaItemFromPlaylistUrl(url);
                }
            }
        } catch (err) {
            console.error(err);
        }
        return musicMetadataJs.createMediaItemFromUrl(url);
    }
}

export async function createMediaItemFromPlaylistUrl(playlistUrl: string): Promise<MediaItem> {
    const urls = await parsePlaylistFromUrl(playlistUrl);
    const url = urls[0];
    if (url) {
        const headers = await getHeaders(url);
        if (headers.get('icy-name') || headers.get('icy-url')) {
            const item = createMediaItemFromIcecastHeaders(url, headers);
            return {...item, srcs: urls};
        }
    }
    throw Error('Could not parse playlist');
}

function createMediaItemFromIcecastHeaders(url: string, headers: Headers): RadioStation {
    const genre = headers.get('icy-genre');
    return {
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        linearType: LinearType.Station,
        playbackType: PlaybackType.Icecast,
        src: url,
        title: headers.get('icy-name') || url,
        externalUrl: headers.get('icy-url') || undefined,
        description: headers.get('icy-description') || undefined,
        genres: genre ? [genre] : undefined,
        duration: MAX_DURATION,
        playedAt: 0,
        bitRate: Number(headers.get('icy-br')) || undefined,
        noScrobble: true,
    };
}
