import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import SortParams from 'types/SortParams';
import {CreateChildPager} from 'services/pagers/MediaPager';
import {getService} from 'services/mediaServices';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';

type CreateFromObjectParams<T extends MediaObject> = Pick<
    MediaSource<T>,
    'itemType' | 'isPin' | 'primaryItems' | 'primaryItems' | 'secondaryItems' | 'tertiaryItems'
> & {
    readonly src: string;
    readonly childSort?: SortParams;
    readonly createChildPager?: CreateChildPager<any>;
};

function createFromObject<T extends MediaObject>({
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
        primaryItems: isPin
            ? primaryItems
            : {
                  ...primaryItems,
                  layout: {
                      ...primaryItems?.layout,
                      view: 'card compact',
                  },
              },
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

const mediaSources = {
    createFromObject,
};

export default mediaSources;
