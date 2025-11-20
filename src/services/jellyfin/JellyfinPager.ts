import MediaObject from 'types/MediaObject';
import {PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import {CreateChildPager} from 'services/pagers/MediaPager';
import IndexedPager from 'services/pagers/IndexedPager';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import jellyfinSettings from './jellyfinSettings';
import jellyfinApi from './jellyfinApi';
import {createMediaObject} from './jellyfinUtils';

export default class JellyfinPager<T extends MediaObject> extends IndexedPager<T> {
    static minPageSize = 10;
    static maxPageSize = 500;

    constructor(
        path: string,
        params: Record<string, unknown> = {},
        options?: Partial<PagerConfig<T>>,
        parent?: ParentOf<T>,
        createChildPager?: CreateChildPager<T>
    ) {
        super(
            async (pageNumber, pageSize) => {
                const page = await jellyfinApi.getPage(path, {
                    ...params,
                    Limit: String(pageSize),
                    StartIndex: String((pageNumber - 1) * pageSize),
                });
                return {
                    ...page,
                    items: page.items.map((item) =>
                        createMediaObject(
                            item,
                            parent,
                            getSourceSorting(this.childSortId) || options?.childSort
                        )
                    ),
                };
            },
            {
                ...options,
                pageSize: Math.min(
                    options?.maxSize || Infinity,
                    options?.pageSize ||
                        (jellyfinSettings.isLocal ? JellyfinPager.maxPageSize : 200)
                ),
            },
            createChildPager
        );
    }
}
