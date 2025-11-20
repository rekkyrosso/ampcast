import {Primitive} from 'type-fest';
import MediaObject from 'types/MediaObject';
import {PagerConfig} from 'types/Pager';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import {CreateChildPager} from 'services/pagers/MediaPager';
import IndexedPager from 'services/pagers/IndexedPager';
import navidromeApi from './navidromeApi';
import navidromeSettings from './navidromeSettings';
import {createMediaObject} from './navidromeUtils';

export default class NavidromeIndexedPager<T extends MediaObject> extends IndexedPager<T> {
    constructor(
        itemType: T['itemType'],
        path: string,
        params?: Record<string, Primitive>,
        options?: Partial<PagerConfig<T>>,
        createChildPager?: CreateChildPager<T>
    ) {
        super(
            async (pageNumber, pageSize) => {
                const _start = (pageNumber - 1) * pageSize;
                const _end = _start + pageSize;
                const {items, total} = await navidromeApi.getPage(path, {
                    ...params,
                    _start,
                    _end,
                    library_id: navidromeSettings.libraryId,
                });
                return {
                    items: items.map((item) =>
                        createMediaObject(
                            itemType,
                            item,
                            path === 'radio',
                            getSourceSorting(this.childSortId) || options?.childSort
                        )
                    ),
                    total,
                };
            },
            {pageSize: 200, ...options},
            createChildPager
        );
    }
}
