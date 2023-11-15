import type {IAudioMetadata, IFileInfo, IOptions} from 'music-metadata-browser';
import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import {Logger} from 'utils';

const logger = new Logger('music-metadata');

const options: IOptions = {duration: true, skipCovers: true, skipPostHeaders: true};

export async function createMediaItemFromFile(file: File): Promise<MediaItem> {
    const {parseBlob} = await import(
        /* webpackChunkName: "music-metadata-browser" */
        /* webpackMode: "lazy-once" */
        'music-metadata-browser'
    );

    let metadata: IAudioMetadata;

    try {
        metadata = await parseBlob(file, options);
    } catch (err) {
        logger.log(`Error parsing file: ${file.name}`);
        logger.error(err);
        metadata = {format: {}, common: {}} as IAudioMetadata;
    }

    const {format} = metadata;
    const isVideo = file.type.startsWith('video');
    const duration = format.duration || (await getFileDuration(file));

    const item = createMediaItem(
        isVideo ? MediaType.Video : MediaType.Audio,
        `blob:${nanoid()}`,
        file.name.replace(/\.\w+$/, ''),
        metadata
    );

    return {
        ...item,
        duration: duration ? Number(duration.toFixed(3)) : 0,
        blob: file,
    };
}

export async function createMediaItemFromUrl(url: string): Promise<MediaItem> {
    let metadata: IAudioMetadata;

    try {
        metadata = await fetchFromUrl(url, options);
    } catch (err) {
        logger.log(`Error parsing url: ${url}`);
        logger.error(err);
        metadata = {format: {}, common: {}} as IAudioMetadata;
    }

    const {format} = metadata;
    const isVideo = false; // TODO
    const duration = format.duration || (await getDuration(isVideo ? 'video' : 'audio', url));

    const item = createMediaItem(isVideo ? MediaType.Video : MediaType.Audio, url, url, metadata);

    return {
        ...item,
        duration: duration ? Number(duration.toFixed(3)) : 0,
    };
}

function createMediaItem(
    mediaType: MediaType,
    src: string,
    title: string,
    metadata: IAudioMetadata
): MediaItem {
    const {common} = metadata;
    const floor = (value: number | null = 0) => Math.floor(Number(value)) || 0;

    return {
        itemType: ItemType.Media,
        mediaType,
        src,
        playbackType: PlaybackType.Direct,
        externalUrl: '',
        title: common.title || title,
        artists: common.artist ? [common.artist] : common.artists,
        albumArtist: common.album ? common.albumartist || '' : '',
        album: common.album || '',
        genres: common.genre,
        duration: 0,
        track: floor(common.track?.no),
        disc: floor(common.disk?.no),
        // bpm: floor(common.bpm),
        year: floor(common.year),
        mood: common.mood || '',
        rating: Number(common.rating) || 0,
        isrc: common.isrc?.[0],
        recording_mbid: common.musicbrainz_recordingid,
        playedAt: 0,
        noScrobble: !common.title,
    };
}

async function getFileDuration(file: File): Promise<number> {
    const isVideo = file.type.startsWith('video');
    const type = isVideo ? 'video' : 'audio';
    const url = URL.createObjectURL(file);
    return getDuration(type, url);
}

async function getDuration(type: 'audio' | 'video', url: string): Promise<number> {
    return new Promise((resolve) => {
        const media = document.createElement(type);
        const handleEvent = () => {
            const duration = media.error ? 0 : media.duration;
            media.ondurationchange = null;
            media.onerror = null;
            media.src = '';
            media.removeAttribute('src');
            URL.revokeObjectURL(url);
            clearTimeout(timerId);
            resolve(duration);
        };
        const timerId = setTimeout(handleEvent, 5000);
        media.ondurationchange = handleEvent;
        media.onerror = handleEvent;
        media.onended = handleEvent;
        media.muted = true;
        media.src = url;
    });
}

// From: https://github.com/Borewit/music-metadata-browser/blob/master/lib/index.ts
// Adapted to add a timeout.
export async function fetchFromUrl(url: string, options?: IOptions): Promise<IAudioMetadata> {
    const {parseBlob, parseReadableStream} = await import(
        /* webpackChunkName: "music-metadata-browser" */
        /* webpackMode: "lazy-once" */
        'music-metadata-browser'
    );
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {signal: controller.signal});
    clearTimeout(timerId);
    if (response.ok) {
        if (response.body) {
            const size = response.headers.get('Content-Length');
            const fileInfo: IFileInfo = {
                size: size ? parseInt(size, 10) : undefined,
                mimeType: response.headers.get('Content-Type') ?? undefined,
            };
            const metadata = await parseReadableStream(response.body, fileInfo, options);
            if (!response.body.locked) {
                // Prevent error in Firefox
                await response.body.cancel();
            }
            return metadata;
        } else {
            // Fall back on Blob
            return parseBlob(await response.blob(), options);
        }
    } else {
        throw Error(`HTTP error status=${response.status}: ${response.statusText}`);
    }
}
