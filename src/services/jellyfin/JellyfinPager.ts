import type {BaseItemDto} from '@jellyfin/sdk/lib/generated-client/models';
import MediaObject from 'types/MediaObject';
import {PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import {CreateChildPager} from 'services/pagers/AbstractPager';
import OffsetPager from 'services/pagers/OffsetPager';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import jellyfinSettings from './jellyfinSettings';
import jellyfinApi from './jellyfinApi';
import {createMediaObject} from './jellyfinUtils';

export default class JellyfinPager<T extends MediaObject> extends OffsetPager<T> {
    static minPageSize = 10;
    static maxPageSize = 500;

    constructor(
        path: string,
        params: Record<string, unknown> = {},
        options?: Partial<PagerConfig>,
        parent?: ParentOf<T>,
        createChildPager?: CreateChildPager<T>
    ) {
        super(
            async (pageNumber, pageSize) => {
                const data = await jellyfinApi.get(path, {
                    IncludeItemTypes: 'Audio',
                    Fields: 'AudioInfo,ChildCount,DateCreated,Genres,MediaSources,Path,ProviderIds,Overview',
                    EnableUserData: true,
                    Recursive: true,
                    ImageTypeLimit: 1,
                    EnableImageTypes: 'Primary',
                    EnableTotalRecordCount: true,
                    ...params,
                    Limit: String(pageSize),
                    StartIndex: String((pageNumber - 1) * pageSize),
                });
                const page = (data as BaseItemDto).Type
                    ? {
                          items: [data as BaseItemDto],
                          total: 1,
                      }
                    : {
                          items: data.Items || [],
                          total: data.TotalRecordCount || data.Items?.length,
                      };
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
