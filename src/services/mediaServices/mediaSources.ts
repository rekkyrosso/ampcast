import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaSource, {MediaSourceItems} from 'types/MediaSource';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import SortParams from 'types/SortParams';
import {MAX_DURATION} from 'services/constants';
import {CreateChildPager} from 'services/pagers/MediaPager';
import {getService} from 'services/mediaServices';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import stationStore from 'services/internetRadio/stationStore';

type CreateFromObjectParams<T extends MediaObject> = Pick<
    MediaSource<T>,
    'itemType' | 'isPin' | 'primaryItems' | 'primaryItems' | 'secondaryItems' | 'tertiaryItems'
> & {
    readonly src: string;
    readonly childSort?: SortParams;
    readonly createChildPager?: CreateChildPager<any>;
};

export function createMediaSourceFromObject<T extends MediaObject>({
    src,
    itemType,
    isPin,
    primaryItems,
    secondaryItems,
    tertiaryItems,
    childSort,
    createChildPager,
}: CreateFromObjectParams<T>): MediaSource<T> {
    if (isPin && itemType !== ItemType.Playlist) {
        throw Error('Unsupported Pin type.');
    }
    const [serviceId, type] = src.split(':');
    const sourceId = `${serviceId}/${isPin ? 'pinned-' : ''}${type}`;
    return {
        id: src,
        sourceId,
        singular: true,
        title: '',
        icon: 'data',
        itemType,
        isPin,
        primaryItems,
        secondaryItems,
        tertiaryItems,
        search() {
            return new SimpleMediaPager(
                async () => {
                    const service = getService(serviceId);
                    if (service?.getMediaObject) {
                        const object = await service.getMediaObject<T>(src);
                        return [object];
                    } else {
                        throw Error('Not supported');
                    }
                },
                childSort
                    ? {
                          childSort,
                          childSortId: `${sourceId}/2`,
                      }
                    : undefined,
                createChildPager
            );
        },
    };
}

export function createRadioStation({
    src,
    title,
    thumbnails,
}: Pick<MediaItem, 'src' | 'title' | 'thumbnails'>): MediaItem {
    return {
        src,
        title,
        thumbnails,
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        linearType: LinearType.Station,
        playbackType: PlaybackType.Direct,
        duration: MAX_DURATION,
        playedAt: 0,
        skippable: true,
        isFavoriteStation: stationStore.isFavorite({src}),
        synthetic: true,
    };
}

export function getSourceItems<T extends MediaObject>(
    source?: MediaSource<any>,
    level?: 1 | 2 | 3
): MediaSourceItems<T> {
    const sourceItems =
        level === 3
            ? source?.tertiaryItems
            : level === 2 && !(source?.singular && source.itemType === ItemType.Media)
              ? source?.secondaryItems
              : source?.primaryItems;
    return sourceItems || {};
}
