import MediaObject from 'types/MediaObject';
import {PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import {CreateChildPager} from 'services/pagers/MediaPager';
import IndexedPager from 'services/pagers/IndexedPager';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import plexApi, {PlexRequest} from './plexApi';
import plexSettings from './plexSettings';
import {createMediaObjects, getMediaAlbums, getMetadata} from './plexUtils';

export default class PlexPager<T extends MediaObject> extends IndexedPager<T> {
    constructor(
        plexRequest: PlexRequest,
        options?: Partial<PagerConfig<T>>,
        parent?: ParentOf<T>,
        createChildPager?: CreateChildPager<T>
    ) {
        super(
            async (pageNumber, pageSize) => {
                const page = await plexApi.getPage(
                    plexRequest,
                    (pageNumber - 1) * pageSize,
                    pageSize
                );
                const [plexItems, albums] = await Promise.all([
                    getMetadata(page.items),
                    getMediaAlbums(page.items),
                ]);
                const items = createMediaObjects<T>(
                    plexItems,
                    parent,
                    albums,
                    getSourceSorting(this.childSortId) || options?.childSort
                );
                return {items, total: page.total};
            },
            {
                pageSize: plexSettings.connection?.local ? 500 : 200,
                ...options,
            },
            createChildPager
        );
    }
}
