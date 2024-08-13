import type {IAudioMetadata, IFileInfo, IOptions} from 'music-metadata';
import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import {Logger} from 'utils';

const logger = new Logger('music-metadata');

const options: IOptions = {
    duration: true,
    skipCovers: true,
    skipPostHeaders: true,
};

const noMetadata: IAudioMetadata = {
    common: {
        track: {no: null, of: null},
        disk: {no: null, of: null},
    } as any,
    format: {trackInfo: []} as any,
    native: {},
    quality: {warnings: []},
};

export async function createMediaItemFromFile(file: File): Promise<MediaItem> {
    const {parseBlob} = await import(
        /* webpackChunkName: "music-metadata" */
        /* webpackMode: "lazy-once" */
        'music-metadata'
    );
    let metadata = noMetadata;
    try {
        metadata = await parseBlob(file, options);
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
        duration: duration ? Number(duration.toFixed(3)) : 0,
        blob: file,
    };
}

export async function createMediaItemFromUrl(url: string): Promise<MediaItem> {
    let metadata = noMetadata;
    try {
        metadata = await fetchFromUrl(url, options);
    } catch (err) {
        logger.error(err);
    }
    const {format} = metadata;
    const isVideo = false; // TODO
    const duration = format.duration || 0;
    const item = createMediaItem(isVideo ? MediaType.Video : MediaType.Audio, url, url, metadata);

    return {
        ...item,
        duration: duration ? Number(duration.toFixed(3)) : 0,
    };
}

async function fetchFromUrl(url: string, options?: IOptions): Promise<IAudioMetadata> {
    const {parseBlob, parseWebStream} = await import(
        /* webpackChunkName: "music-metadata" */
        /* webpackMode: "lazy-once" */
        'music-metadata'
    );
    const response = await fetch(url, {signal: AbortSignal.timeout(3000)});
    if (response.ok) {
        if (response.body) {
            const size = response.headers.get('Content-Length');
            const fileInfo: IFileInfo = {
                size: size ? parseInt(size, 10) : undefined,
                mimeType: response.headers.get('Content-Type') ?? undefined,
            };
            const metadata = await parseWebStream(response.body, fileInfo, options);
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
        // mood: common.mood || '',
        rating: Number(common.rating) || 0,
        isrc: common.isrc?.[0],
        recording_mbid: common.musicbrainz_recordingid,
        artist_mbids: common.musicbrainz_artistid,
        track_mbid: common.musicbrainz_trackid,
        release_mbid: common.musicbrainz_albumid,
        playedAt: 0,
        noScrobble: !common.title,
    };
}
