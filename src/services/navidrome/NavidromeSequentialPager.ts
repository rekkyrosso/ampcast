import {Primitive} from 'type-fest';
import MediaObject from 'types/MediaObject';
import {PagerConfig} from 'types/Pager';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import {CreateChildPager} from 'services/pagers/MediaPager';
import SequentialPager from 'services/pagers/SequentialPager';
import navidromeApi from './navidromeApi';
import navidromeSettings from './navidromeSettings';
import {createMediaObject} from './navidromeUtils';

export default class NavidromeSequentialPager<
    T extends MediaObject,
    S extends Navidrome.MediaObject
> extends SequentialPager<T> {
    constructor(
        itemType: T['itemType'],
        path: string,
        params: Record<string, Primitive>,
        filterItems: (items: readonly S[]) => S[],
        options?: Partial<PagerConfig>,
        createChildPager?: CreateChildPager<T>
    ) {
        let _start = 0;
        super(
            async (pageSize) => {
                const _end = _start + pageSize;
                const result = await navidromeApi.getPage<S>(path, {
                    ...params,
                    _start,
                    _end,
                    library_id: navidromeSettings.libraryId,
                });
                _start = _end;
                const items = filterItems(result.items);
                const atEnd = items.length < pageSize;
                return {
                    items: items.map((item) =>
                        createMediaObject(
                            itemType,
                            item,
                            path === 'radio',
                            getSourceSorting(this.childSortId) || options?.childSort
                        )
                    ),
                    atEnd,
                };
            },
            {pageSize: 200, ...options},
            createChildPager
        );
    }
}
