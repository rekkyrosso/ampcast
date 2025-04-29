import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import {uniq} from 'utils';
import mixcloudApi from 'services/mixcloud/mixcloudApi';
import soundcloudApi from 'services/soundcloud/soundcloudApi';
import youtubeApi from 'services/youtube/youtubeApi';
import musicMetadataJs from './music-metadata-js';
import {mergeThumbnails} from './thumbnails';

export interface AddMetadataOptions {
    overWrite?: boolean;
    strictMatch?: boolean;
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
        return musicMetadataJs.createMediaItemFromUrl(url);
    }
}
