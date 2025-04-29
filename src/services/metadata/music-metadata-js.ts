import {nanoid} from 'nanoid';
import type {IAudioMetadata} from 'music-metadata';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import Thumbnail from 'types/Thumbnail';
import {Logger, loadLibrary} from 'utils';

const logger = new Logger('music-metadata');

const noIAudioMetadata: IAudioMetadata = {
    common: {
        track: {no: null, of: null},
        disk: {no: null, of: null},
    } as any,
    format: {trackInfo: []} as any,
    native: {},
    quality: {warnings: []},
};

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

const musicMetadataJs = {
    createMediaItemFromFile,
    createMediaItemFromUrl,
    getCoverArtFromBlob,
};

export default musicMetadataJs;
