import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';

async function getMediaItem(url: string): Promise<MediaItem> {
    const response = await fetch(`https://app.mixcloud.com/oembed/?url=${encodeURIComponent(url)}`);

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

    const item = await response.json();

    url = item.url || url;

    return {
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        playbackType: PlaybackType.IFrame,
        src: `mixcloud:url:${nanoid()}`,
        srcs: [url],
        externalUrl: url,
        title: item.title,
        duration: 0,
        playedAt: 0,
        artists: item.author_name ? [item.author_name] : undefined,
        thumbnails: [
            {
                url: item.image,
                width: 600,
                height: 600,
            },
        ],
    };
}

const mixcloudApi = {
    getMediaItem,
};

export default mixcloudApi;
