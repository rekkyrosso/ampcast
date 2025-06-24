import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import {getTextFromHtml} from 'utils';

const soundcloudHost = 'https://soundcloud.com';

async function getMediaItem(url: string): Promise<MediaItem> {
    // Remove tracking/playlist/etc info from url.
    url = url.replace(/[?#].*$/, '');

    const response = await fetch(`${soundcloudHost}/oembed.json?url=${encodeURIComponent(url)}`);

    if (!response.ok) {
        switch (response.status) {
            case 401:
                throw Error('Embedding prevented by track owner');

            case 403:
                throw Error('Private track');

            case 404:
                throw Error('Track does not exist');

            default:
                throw Error(`${response.statusText} (${response.status})`);
        }
    }

    const track = await response.json();

    let trackId = '';
    try {
        const div = document.createElement('div');
        div.innerHTML = track.html;
        const iframe = div.firstElementChild as HTMLIFrameElement;
        const srcUrl = new URL(iframe.src);
        const params = new URLSearchParams(srcUrl.search);
        const paramsUrl = params.get('url');
        if (paramsUrl) {
            const trackUrl = new URL(paramsUrl);
            const [id, type] = trackUrl.pathname.split('/').reverse();
            if (type === 'tracks') {
                trackId = id;
            }
        }
    } catch (err) {
        console.warn(err);
    }

    const author = String(track.author_name || '');
    let title = String(track.title || '');
    let artist = author;
    if (title.endsWith(` by ${author}`)) {
        title = title.slice(0, -` by ${author}`.length);
    }
    if (title.startsWith(`${author} - `)) {
        title = title.slice(`${author} - `.length);
    } else {
        // Sometimes the title starts with a different artist.
        // Hopefully this is right.
        const [accreditedArtist, ...rest] = title.split(' - ');
        if (accreditedArtist && rest.length > 0) {
            artist = accreditedArtist;
            title = rest.join(' - ');
        }
    }

    return {
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        playbackType: PlaybackType.IFrame,
        src: trackId ? `soundcloud:tracks:${trackId}` : `soundcloud:url:${nanoid()}`,
        srcs: [url],
        externalUrl: url,
        title: title,
        description: track.description ? getTextFromHtml(track.description) : undefined,
        duration: 0,
        playedAt: 0,
        artists: artist ? [artist] : undefined,
        thumbnails: [
            {
                url: track.thumbnail_url,
                width: track.thumbnail_width || 500,
                height: track.thumbnail_height || 500,
            },
        ],
    };
}

const soundcloudApi = {
    getMediaItem,
};

export default soundcloudApi;
