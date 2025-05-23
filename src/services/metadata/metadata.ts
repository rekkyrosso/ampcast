import {IcecastReadableStream} from 'icecast-metadata-js';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import {Logger, getHeaders, mediaTypes, uniq} from 'utils';
import {MAX_DURATION} from 'services/constants';
import lastfmApi from 'services/lastfm/lastfmApi';
import mixcloudApi from 'services/mixcloud/mixcloudApi';
import musicbrainzApi from 'services/musicbrainz/musicbrainzApi';
import soundcloudApi from 'services/soundcloud/soundcloudApi';
import youtubeApi from 'services/youtube/youtubeApi';
import {createMediaItemFromStream} from './music-metadata-js';
import {mergeThumbnails} from './thumbnails';
import {parsePlaylist} from './playlistParser';

const logger = new Logger('metadata');

export interface AddMetadataOptions {
    overWrite?: boolean;
    strictMatch?: boolean;
}

export async function addMetadata<T extends MediaItem>(item: T, overWrite = false): Promise<T> {
    let foundItem: MediaItem | undefined;
    if (overWrite) {
        const lastfmItem = await lastfmApi.addMetadata(item, {overWrite: true});
        if (lastfmItem === item) {
            // Not enhanced (same item).
            const musicbrainzItem = await musicbrainzApi.addMetadata(item, {overWrite: true});
            if (musicbrainzItem !== item) {
                foundItem = musicbrainzItem;
            }
        } else {
            foundItem = await musicbrainzApi.addMetadata(lastfmItem, {overWrite: false});
        }
    } else {
        foundItem = await musicbrainzApi.addMetadata(item, {overWrite: false});
    }
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

export async function createMediaItemFromUrl(url: string, timeout = 3000): Promise<MediaItem> {
    const {hostname} = new URL(url);
    if (hostname.includes('mixcloud.com')) {
        return mixcloudApi.getMediaItem(url);
    } else if (hostname.includes('soundcloud.com')) {
        return soundcloudApi.getMediaItem(url);
    } else if (/youtu\.?be/.test(hostname)) {
        return youtubeApi.getMediaItem(url);
    } else {
        try {
            let response: Response;
            try {
                response = await fetch(url, {
                    headers: {'Icy-MetaData': '1'},
                    signal: AbortSignal.timeout(timeout),
                });
            } catch (err: any) {
                if (err?.name === 'TimeoutError') {
                    throw err;
                } else {
                    response = await fetch(url, {signal: AbortSignal.timeout(timeout)});
                }
            }

            if (response) {
                const headers = response.headers;
                const contentType = headers?.get('content-type')?.toLowerCase() || '';

                if (mediaTypes.hls.includes(contentType)) {
                    return createMediaItemByPlaybackType(url, PlaybackType.HLSMetadata);
                } else if (mediaTypes.m3u.includes(contentType)) {
                    const text = await response.text();
                    return createMediaItemFromPlaylist(text);
                }

                const isIcy = await hasIcyMetadata(
                    response,
                    mediaTypes.ogg.includes(contentType) ? 'ogg' : 'icy'
                );

                if (headers?.get('icy-name') || headers?.get('icy-url')) {
                    return createMediaItemFromIcecastHeaders(url, headers, isIcy);
                } else if (mediaTypes.ogg.includes(contentType)) {
                    return createMediaItemByPlaybackType(
                        url,
                        isIcy ? PlaybackType.IcecastOgg : PlaybackType.Direct
                    );
                } else if (isIcy) {
                    return createMediaItemByPlaybackType(url, PlaybackType.Icecast);
                } else if (response.body) {
                    return createMediaItemFromStream(url, response.body, headers);
                }
            }
        } catch (err) {
            logger.error(err);
        }
        return createMediaItemByPlaybackType(url, PlaybackType.Direct);
    }
}

async function hasIcyMetadata(response: Response, type: 'icy' | 'ogg'): Promise<boolean> {
    response = response.clone();
    const start = performance.now();
    let found = false;
    const abortError = new Error();
    abortError.name = 'AbortError';
    const abortAfterTimeout = () => {
        if (performance.now() - start > 500) {
            throw abortError;
        }
    };
    const icecast = new IcecastReadableStream(response, {
        metadataTypes: [type],
        icyDetectionTimeout: 500,
        // enableLogging: true,
        onMetadata: () => {
            found = true;
            throw abortError;
        },
        onStream: abortAfterTimeout,
        onMetadataFailed: abortAfterTimeout,
        onError: abortAfterTimeout,
    });
    await icecast.startReading();
    return found;
}

export function getTitleFromUrl(url: string): string {
    const {hostname, pathname} = new URL(url);
    const [path, ...paths] = pathname.replace(/\/+$/, '').split('/').reverse();
    const readableHost = hostname.replace(/^(www)\./, '');
    const readablePath = path.replace(/\.\w+$/, '');
    return path
        ? paths[0]
            ? `${readableHost}/…/${readablePath}`
            : `${readableHost}/${readablePath}`
        : readableHost;
}

function createMediaItemByPlaybackType(url: string, playbackType: PlaybackType): MediaItem {
    const isStation = [PlaybackType.Icecast, PlaybackType.IcecastOgg].includes(playbackType);
    return {
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        linearType: isStation ? LinearType.Station : undefined,
        playbackType,
        src: url,
        title: getTitleFromUrl(url),
        duration: isStation ? MAX_DURATION : 0,
        playedAt: 0,
    };
}

function createMediaItemFromIcecastHeaders(
    url: string,
    headers: Headers,
    isIcy: boolean
): MediaItem {
    const contentType = headers?.get('content-type')?.toLowerCase() || '';
    const genre = headers.get('icy-genre');
    return {
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        linearType: LinearType.Station,
        playbackType: isIcy
            ? mediaTypes.ogg.includes(contentType)
                ? PlaybackType.IcecastOgg
                : PlaybackType.Icecast
            : PlaybackType.Direct,
        src: url,
        title:
            headers.get('icy-name')?.replace(/^(none|stream|no name)$/i, '') || getTitleFromUrl(url),
        externalUrl: headers.get('icy-url') || undefined,
        description: headers.get('icy-description') || undefined,
        genres: genre ? [genre] : undefined,
        duration: MAX_DURATION,
        playedAt: 0,
        bitRate: Number(headers.get('icy-br')) || undefined,
    };
}

async function createMediaItemFromPlaylist(playlist: string): Promise<MediaItem> {
    const urls = parsePlaylist(playlist);
    const url = urls[0];
    if (url) {
        const headers = await getHeaders(url);
        if (headers.get('icy-name') || headers.get('icy-url')) {
            const item = createMediaItemFromIcecastHeaders(url, headers, true);
            return {...item, srcs: urls};
        } else {
            return createMediaItemFromUrl(url);
        }
    }
    throw Error('Empty playlist');
}
