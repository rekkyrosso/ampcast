import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {MediaSourceItems} from 'types/MediaSource';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import SortParams from 'types/SortParams';
import {MAX_DURATION} from 'services/constants';
import {CreateChildPager} from 'services/pagers/MediaPager';
import {getService} from 'services/mediaServices';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import stationStore from 'services/internetRadio/stationStore';
import {otherTracksLayout, radiosLayout, videosLayout} from 'components/MediaList/layouts';

export type CreateSingularMediaSourceParams<T extends MediaObject> = Pick<
    MediaSource<T>,
    'itemType' | 'isPin' | 'primaryItems' | 'primaryItems' | 'secondaryItems' | 'tertiaryItems'
> & {
    readonly src: string;
    readonly childSort?: SortParams;
    readonly createChildPager?: CreateChildPager<any>;
};

export function createSingularMediaSource<T extends MediaObject>({
    src,
    itemType,
    isPin = false,
    childSort,
    createChildPager,
    ...params
}: CreateSingularMediaSourceParams<T>): MediaSource<T> {
    if (isPin && itemType !== ItemType.Playlist) {
        throw Error('Unsupported Pin type.');
    }
    const [serviceId] = src.split(':');
    const sourceId = `${serviceId}/${isPin ? 'pinned-' : ''}${itemType}`;
    return {
        id: src,
        itemType,
        isPin,
        sourceId,
        singular: true,
        title: '',
        icon: serviceId as MediaServiceId,
        ...params,
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

export function getMediaListId(
    source: MediaSource<any>,
    level: 1 | 2 | 3,
    syntheticAlbum?: MediaAlbum
): string {
    let [, syntheticAlbumType = ''] =
        (isAlbumTracks(source, level) ? syntheticAlbum : undefined)?.src.split(':') || [];
    syntheticAlbumType = syntheticAlbumType.replace(/^\w+-/, ''); // Remove prefix (e.g. 'top-tracks' => 'tracks).
    const singular = source?.singular && level === 1;
    return `${source.sourceId || source.id}/${singular ? 0 : syntheticAlbumType || level}`;
}

export function getMediaSourceItems<T extends MediaObject>(
    source?: MediaSource<T>,
    level?: 1 | 2 | 3,
    syntheticAlbum?: MediaAlbum
): MediaSourceItems<T> {
    if (!source || !level) {
        return {};
    }
    const sourceItems =
        (level === 3
            ? source.tertiaryItems
            : level === 2 && !(source.singular && source.itemType === ItemType.Media)
              ? source.secondaryItems
              : source.primaryItems) || {};
    if (isAlbumTracks(source, level) && syntheticAlbum) {
        let label: string | undefined;
        let layout = otherTracksLayout;
        const [, type] = syntheticAlbum.src.split(':');
        if (type === 'radios') {
            layout = radiosLayout;
            label = 'Radios';
        } else if (type === 'videos') {
            layout = videosLayout;
            label = 'Videos';
        }
        return {...sourceItems, label, layout};
    } else {
        return sourceItems;
    }
}

export function isAlbumTracks(source: MediaSource<any>, level: 1 | 2 | 3): boolean {
    return (
        (source.itemType === ItemType.Album && level === 2) ||
        (source.itemType === ItemType.Artist && level === 3)
    );
}
