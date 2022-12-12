import {IAudioMetadata, parseBlob} from 'music-metadata-browser';
import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaType from 'types/MediaType';
import PlaylistItem from 'types/PlaylistItem';
import {Logger} from 'utils';

const logger = new Logger('file');

export async function createMediaItemFromFile(file: File): Promise<PlaylistItem> {
    let metadata: IAudioMetadata;

    try {
        metadata = await parseBlob(file, {duration: true, skipCovers: true});
    } catch (err) {
        logger.log(`Error parsing file: ${file.name}`);
        logger.error(err);
        metadata = {format: {}, common: {}} as IAudioMetadata;
    }

    const {common, format} = metadata;
    const isVideo = file.type.startsWith('video');
    const duration = format.duration || (await getDuration(file));

    const floor = (value: number | null = 0) => Math.floor(Number(value)) || 0;

    return {
        id: '',
        itemType: ItemType.Media,
        mediaType: isVideo ? MediaType.Video : MediaType.Audio,
        src: `blob:${nanoid()}`,
        externalUrl: '',
        title: common.title || file.name.replace(/\.\w+$/, ''),
        artist: common.artist || common.artists?.join(';') || '',
        albumArtist: common.album ? common.albumartist || '' : '',
        album: common.album || '',
        genre: common.genre?.join(';') || '',
        duration: duration ? Number(duration.toFixed(3)) : 0,
        track: floor(common.track?.no),
        disc: floor(common.disk?.no),
        bpm: floor(common.bpm),
        year: floor(common.year),
        mood: common.mood || '',
        rating: Number(common.rating) || 0,
        isrc: common.isrc?.[0],
        recording_mbid: common.musicbrainz_recordingid,
        playedAt: 0,
        blob: file,
    };
}

async function getDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
        const isVideo = file.type.startsWith('video');
        const media = document.createElement(isVideo ? 'video' : 'audio');
        const url = URL.createObjectURL(file);
        const handleEvent = () => {
            const duration = media.error ? 0 : media.duration;
            media.ondurationchange = null;
            media.onerror = null;
            media.src = '';
            media.removeAttribute('src');
            URL.revokeObjectURL(url);
            resolve(duration);
        };
        media.ondurationchange = handleEvent;
        media.onerror = handleEvent;
        media.onended = handleEvent;
        media.muted = true;
        media.src = url;
    });
}
