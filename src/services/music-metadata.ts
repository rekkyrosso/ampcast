import type {IAudioMetadata, IFileInfo, IOptions} from 'music-metadata';
import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import {loadLibrary, Logger} from 'utils';
import mixcloudApi from 'services/mixcloud/mixcloudApi';
import soundcloudApi from 'services/soundcloud/soundcloudApi';
import youtubeApi from 'services/youtube/youtubeApi';

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
    await loadLibrary('music-metadata');
    const {parseBlob} = await import(
        /* webpackMode: "weak" */
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
        duration: Number(duration.toFixed(3)),
        blob: file,
    };
}

export async function createMediaItemFromUrl(url: string): Promise<MediaItem> {
    const host = new URL(url).hostname;
    if (host.includes('mixcloud.com')) {
        return mixcloudApi.getMediaItem(url);
    } else if (host.includes('soundcloud.com')) {
        return soundcloudApi.getMediaItem(url);
    } else if (/youtu\.?be/.test(host)) {
        return youtubeApi.getMediaItem(url);
    } else {
        const {metadata, mimeType} = await fetchFromUrl(url, options);
        const {format} = metadata;
        const isVideo = mimeType?.startsWith('video/');
        const duration = format.duration || 0;
        const item = createMediaItem(
            isVideo ? MediaType.Video : MediaType.Audio,
            url,
            url,
            metadata
        );

        return {
            ...item,
            duration: Number(duration.toFixed(3)),
        };
    }
}

async function fetchFromUrl(
    url: string,
    options?: IOptions
): Promise<{metadata: IAudioMetadata; mimeType?: string}> {
    await loadLibrary('music-metadata');
    const {parseBlob, parseWebStream} = await import(
        /* webpackMode: "weak" */
        'music-metadata'
    );
    const response = await fetch(url, {signal: AbortSignal.timeout(3000)});
    if (response.ok) {
        if (response.body) {
            const size = response.headers.get('Content-Length');
            const mimeType = response.headers.get('Content-Type') ?? undefined;
            const fileInfo: IFileInfo = {
                mimeType,
                size: size ? parseInt(size, 10) : undefined,
            };
            if (mimeType && !/^(audio|video)\//.test(mimeType)) {
                throw Error('No media found');
            }
            let metadata = noMetadata;
            try {
                metadata = await parseWebStream(response.body, fileInfo, options);
            } catch (err) {
                logger.error(err);
            }
            if (!response.body.locked) {
                // Prevent error in Firefox
                await response.body.cancel();
            }
            return {metadata, mimeType};
        } else {
            // Fall back on Blob
            const blob = await response.blob();
            const metadata = await parseBlob(blob, options);
            return {metadata, mimeType: blob.type};
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
