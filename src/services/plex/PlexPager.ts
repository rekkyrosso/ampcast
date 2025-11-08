import MediaAlbum from 'types/MediaAlbum';
import MediaObject from 'types/MediaObject';
import {PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import {CreateChildPager} from 'services/pagers/MediaPager';
import IndexedPager from 'services/pagers/IndexedPager';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import plexApi, {PlexRequest} from './plexApi';
import plexMediaType from './plexMediaType';
import plexSettings from './plexSettings';
import {createMediaObjects, getMediaAlbums, getMetadata} from './plexUtils';

export default class PlexPager<T extends MediaObject> extends IndexedPager<T> {
    static minPageSize = 10;
    static plexMaxPageSize = 500;

    constructor(
        plexRequest: PlexRequest,
        options?: Partial<PagerConfig>,
        parent?: ParentOf<T>,
        createChildPager?: CreateChildPager<T>
    ) {
        super(
            async (pageNumber, pageSize) => {
                const {headers, ...rest} = plexRequest;
                const {path, params} = rest;
                const isSearchPager =
                    path.endsWith('/all') &&
                    !!(params?.title || params?.originalTitle) &&
                    params.type !== plexMediaType.Playlist &&
                    !params.extraType;
                const request = {
                    ...rest,
                    headers: {
                        ...headers,
                        'X-Plex-Container-Size': String(pageSize),
                        'X-Plex-Container-Start': String((pageNumber - 1) * pageSize),
                    },
                };
                let plexItems: readonly plex.MediaObject[];
                let albums: readonly MediaAlbum[] = [];
                let total = 0;
                if (isSearchPager && pageNumber === 1) {
                    const page = await plexApi.search(request);
                    plexItems = page.items;
                    total = page.total || plexItems.length;
                } else {
                    const {
                        MediaContainer: {Metadata = [], size, totalSize},
                    } = await plexApi.fetchJSON<plex.MetadataResponse>(request);
                    plexItems = Metadata;
                    total = totalSize || size;
                }
                [plexItems, albums] = await Promise.all([
                    getMetadata(plexItems),
                    getMediaAlbums(plexItems),
                ]);
                const items = createMediaObjects<T>(
                    plexItems,
                    parent,
                    albums,
                    getSourceSorting(this.childSortId) || options?.childSort
                );
                return {items, total};
            },
            {
                pageSize: plexSettings.connection?.local ? PlexPager.plexMaxPageSize : 200,
                ...options,
            },
            createChildPager
        );
    }
}
