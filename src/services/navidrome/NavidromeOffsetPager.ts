import {Primitive} from 'type-fest';
import MediaObject from 'types/MediaObject';
import {PagerConfig} from 'types/Pager';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import {CreateChildPager} from 'services/pagers/AbstractPager';
import OffsetPager from 'services/pagers/OffsetPager';
import navidromeApi from './navidromeApi';
import navidromeSettings from './navidromeSettings';
import {createMediaObject} from './navidromeUtils';

export default class NavidromeOffsetPager<T extends MediaObject> extends OffsetPager<T> {
    constructor(
        itemType: T['itemType'],
        path: string,
        params?: Record<string, Primitive>,
        options?: Partial<PagerConfig>,
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
