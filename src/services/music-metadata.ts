import type {IAudioMetadata, IFileInfo, IOptions} from 'music-metadata-browser';
import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';

const options: IOptions = {duration: true, skipCovers: true, skipPostHeaders: true};

export async function createMediaItemFromFile(file: File): Promise<MediaItem> {
    const {parseBlob} = await import(
        /* webpackChunkName: "music-metadata-browser" */
        /* webpackMode: "lazy-once" */
        'music-metadata-browser'
    );

    const metadata = await parseBlob(file, options);
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
        duration: duration ? Number(duration.toFixed(3)) : 0,
        blob: file,
    };
}

export async function createMediaItemFromUrl(url: string): Promise<MediaItem> {
    const metadata = await fetchFromUrl(url, options);
    const {format} = metadata;
    const isVideo = false; // TODO
    const duration = format.duration || 0;
    const item = createMediaItem(isVideo ? MediaType.Video : MediaType.Audio, url, url, metadata);

    return {
        ...item,
        duration: duration ? Number(duration.toFixed(3)) : 0,
    };
}

// From: https://github.com/Borewit/music-metadata-browser/blob/master/lib/index.ts
// Adapted to add a timeout.
async function fetchFromUrl(url: string, options?: IOptions): Promise<IAudioMetadata> {
    const {parseBlob, parseReadableStream} = await import(
        /* webpackChunkName: "music-metadata-browser" */
        /* webpackMode: "lazy-once" */
        'music-metadata-browser'
    );
    const response = await fetch(url, {signal: AbortSignal.timeout(3000)});
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
        title: common.title || name,
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
