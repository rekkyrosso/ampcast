import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import Thumbnail from 'types/Thumbnail';
import {exists} from 'utils';

async function getMediaItem(url: string): Promise<MediaItem> {
    const {pathname} = new URL(url);
    const response = await fetch(`https://api.mixcloud.com${pathname}`);

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

    const item: Mixcloud.Cloudcast = await response.json();

    if (item?.audio_length === undefined) {
        throw Error('Not a valid Mixcloud cloudcast URL.');
    }

    url = item.url || url;

    const mediaItem: MediaItem = {
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        playbackType: PlaybackType.IFrame,
        src: `mixcloud:cloudcast:${item.key}`,
        srcs: [url],
        externalUrl: url,
        title: item.name,
        duration: item.audio_length,
        playedAt: 0,
        artists: item.user?.name ? [item.user.name] : undefined,
        genres: item.tags?.map((tag) => tag.name),
        globalLikes: item.favorite_count,
        globalPlayCount: item.play_count,
        thumbnails: createThumbnails(item),
    };

    return mediaItem;
}

function createThumbnails({
    pictures,
}: Pick<Mixcloud.Cloudcast, 'pictures'>): readonly Thumbnail[] | undefined {
    try {
        return Object.values(pictures)
            .map((url: string): Thumbnail | undefined => {
                try {
                    // Sample URL:
                    // "https://thumbnailer.mixcloud.com/unsafe/25x25/profile/b/e/d/c/00c5-6759-4598-8106-571248c5a44e",
                    return new URL(url).pathname
                        .split('/')
                        .filter((part) => /\d+x\d+/.test(part))
                        .map((part) => part.split('x'))
                        .map(([size]) => Number(size))
                        .filter((size) => size > 200)
                        .map((size) => ({
                            url,
                            width: size,
                            height: size,
                        }))[0];
                } catch (err) {
                    console.error(err);
                }
            })
            .filter(exists);
    } catch (err) {
        console.error(err);
    }
}

const mixcloudApi = {
    getMediaItem,
};

export default mixcloudApi;
