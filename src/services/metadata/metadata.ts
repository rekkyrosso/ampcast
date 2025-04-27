import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import MediaObject from 'types/MediaObject';
import Thumbnail from 'types/Thumbnail';
import type {IAudioMetadata} from 'music-metadata';
import {Logger, loadLibrary, uniq} from 'utils';
import lastfmApi from 'services/lastfm/lastfmApi';
import mixcloudApi from 'services/mixcloud/mixcloudApi';
import musicbrainzApi from 'services/musicbrainz/musicbrainzApi';
import soundcloudApi from 'services/soundcloud/soundcloudApi';
import youtubeApi from 'services/youtube/youtubeApi';
import {mergeThumbnails} from './thumbnails';

const logger = new Logger('metadata');

export interface AddMetadataOptions {
    overWrite?: boolean;
    strictMatch?: boolean;
}

const noIAudioMetadata: IAudioMetadata = {
    common: {
        track: {no: null, of: null},
        disk: {no: null, of: null},
    } as any,
    format: {trackInfo: []} as any,
    native: {},
    quality: {warnings: []},
};

export async function addMetadata<T extends MediaItem>(
    item: T,
    options?: AddMetadataOptions,
    signal?: AbortSignal
): Promise<T> {
    const [lastfmEnhanced, musicbrainzEnhanced] = await Promise.all([
        // These don't throw
        lastfmApi.addMetadata(item, options, signal),
        musicbrainzApi.addMetadata(item, options, signal),
    ]);
    const lastfmItem = lastfmEnhanced === item ? undefined : lastfmEnhanced;
    const musicbrainzItem = musicbrainzEnhanced === item ? undefined : musicbrainzEnhanced;
    logger.log({lastfmItem, musicbrainzItem});
    // Prefer MusicBrainz data.
    // Combining the results might lead to inconsistent data.
    const foundItem: MediaItem | undefined = musicbrainzItem || lastfmItem;
    if (foundItem) {
        let resultItem: T;
        if (options?.overWrite) {
            // Prefer this metadata.
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {src, externalUrl, playedAt, ...values} = foundItem;
            resultItem = bestOf(values as T, item);
        } else {
            resultItem = bestOf(item, foundItem as Partial<T>);
        }
        // Use all of the thumbnails.
        const thumbnails = mergeThumbnails(lastfmItem, musicbrainzItem);
        return {...resultItem, thumbnails};
    }
    return item;
}

export function bestOf<T extends MediaObject>(a: T, b: Partial<T> = {}): T {
    const keys = uniq(Object.keys(a).concat(Object.keys(b))) as (keyof T)[];
    const result = keys.reduce<T>((result: T, key: keyof T) => {
        if (a[key] !== undefined) {
            result[key] = a[key];
        } else if (b[key] !== undefined) {
            result[key] = b[key]!;
        }
        return result;
    }, {} as T);
    (result as any).thumbnails = mergeThumbnails(a, b);
    if (result.itemType === ItemType.Media) {
        (result as any).duration =
            (a as MediaItem).duration || (b as Partial<MediaItem>).duration || 0;
    }
    return result;
}

export async function createMediaItemFromFile(file: File): Promise<MediaItem> {
    await loadLibrary('music-metadata');
    const {parseBlob} = await import(
        /* webpackMode: "weak" */
        'music-metadata'
    );
    let metadata = noIAudioMetadata;
    try {
        metadata = await parseBlob(file, {
            duration: true,
            skipCovers: true,
        });
    } catch (err) {
        logger.error(err);
    }
    const {format} = metadata;
    const isVideo = file.type.startsWith('video');
    const duration = format.duration || 0;
    const item = createMediaItem(
        isVideo ? MediaType.Video : MediaType.Audio,
        `blob:${nanoid()}`,
        file.name.replace(/\.\w+$/, ''),
        metadata
    );

    return {
        ...item,
        duration: Number(duration.toFixed(3)),
        blob: file,
    };
}

export async function createMediaItemFromUrl(url: string): Promise<MediaItem> {
    const {hostname, pathname} = new URL(url);
    if (hostname.includes('mixcloud.com')) {
        return mixcloudApi.getMediaItem(url);
    } else if (hostname.includes('soundcloud.com')) {
        return soundcloudApi.getMediaItem(url);
    } else if (/youtu\.?be/.test(hostname)) {
        return youtubeApi.getMediaItem(url);
    } else {
        const {metadata, mimeType} = await fetchFromUrl(url);
        const isVideo = mimeType?.startsWith('video/');
        const duration = metadata.format.duration || 0;
        const item = createMediaItem(
            isVideo ? MediaType.Video : MediaType.Audio,
            url,
            `${hostname.replace(/^www\./, '')}${pathname.replace(/\/+$/, '')}`,
            metadata
        );

        return {
            ...item,
            duration: Number(duration.toFixed(3)),
        };
    }
}

export async function getCoverArtFromBlob(blob: Blob): Promise<Thumbnail | undefined> {
    await loadLibrary('music-metadata');
    const {parseBlob, selectCover} = await import(
        /* webpackMode: "weak" */
        'music-metadata'
    );
    try {
        const {common} = await parseBlob(blob, {
            duration: false,
            skipCovers: false,
        });
        const cover = selectCover(common.picture);
        if (cover) {
            const data = Uint8Array.from(cover.data);
            const type = cover.format;
            const url = URL.createObjectURL(new Blob([data.buffer], type ? {type} : undefined));
            let {width, height} = cover as any;
            if (!width || !height) {
                const img = new Image();
                img.src = url;
                width = img.width;
                height = img.height;
            }
            return {url, width, height};
        }
    } catch (err) {
        logger.error(err);
    }
}

async function fetchFromUrl(url: string): Promise<{metadata: IAudioMetadata; mimeType?: string}> {
    await loadLibrary('music-metadata');
    const {parseWebStream} = await import(
        /* webpackMode: "weak" */
        'music-metadata'
    );
    const response = await fetch(url, {signal: AbortSignal.timeout(3000)});
    if (response.ok) {
        if (response.body) {
            const size = response.headers.get('Content-Length');
            const mimeType = response.headers.get('Content-Type') ?? undefined;
            if (mimeType?.startsWith('text/')) {
                throw Error('No media found');
            }
            let metadata = noIAudioMetadata;
            try {
                metadata = await parseWebStream(
                    response.body,
                    {
                        mimeType,
                        size: size ? parseInt(size, 10) : undefined,
                    },
                    {
                        duration: false,
                        skipCovers: true,
                        skipPostHeaders: true,
                    }
                );
                if (!response.body.locked) {
                    // Prevent error in Firefox
                    await response.body.cancel();
                }
            } catch (err) {
                logger.error(err);
            }
            return {metadata, mimeType};
        } else {
            throw Error('No response body');
        }
    } else {
        throw Error(response.statusText || 'Could not load media');
    }
}

function createMediaItem(
    mediaType: MediaType,
    src: string,
    name: string, // file name/url
    metadata: IAudioMetadata
): MediaItem {
    const {common} = metadata;
    const floor = (value: number | null = 0) => Math.floor(Number(value)) || 0;

    return {
        itemType: ItemType.Media,
        mediaType,
        playbackType: PlaybackType.Direct,
        src,
        externalUrl: '',
        title: (common.title || name).trim(),
        artists: common.artist
            ? [common.artist.trim()]
            : common.artists?.map((artist) => artist.trim()),
        albumArtist: common.album ? common.albumartist?.trim() || '' : '',
        album: common.album?.trim() || '',
        genres: common.genre,
        duration: 0,
        track: floor(common.track?.no),
        disc: floor(common.disk?.no),
        // bpm: floor(common.bpm),
        year: floor(common.year),
        // mood: common.mood || '',
        rating: Number(common.rating) || 0,
        isrc: common.isrc?.[0],
        recording_mbid: common.musicbrainz_recordingid,
        artist_mbids: common.musicbrainz_artistid,
        track_mbid: common.musicbrainz_trackid,
        release_mbid: common.musicbrainz_albumid,
        playedAt: 0,
        noScrobble: !common.title,
        albumGain: common.replaygain_album_gain?.dB,
        albumPeak: common.replaygain_album_peak?.dB,
        trackGain: common.replaygain_track_gain?.dB,
        trackPeak: common.replaygain_track_peak?.dB,
    };
}
