import MediaObject from 'types/MediaObject';
import {PagerConfig} from 'types/Pager';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import {CreateChildPager} from 'services/pagers/MediaPager';
import SequentialPager from 'services/pagers/SequentialPager';
import ibroadcastLibrary from './ibroadcastLibrary';
import {createMediaObject} from './ibroadcastUtils';

export default class IBroadcastPager<T extends MediaObject> extends SequentialPager<T> {
    constructor(
        section: iBroadcast.LibrarySection,
        fetch: () => Promise<readonly string[]>,
        options?: Partial<PagerConfig<T>>,
        createChildPager?: CreateChildPager<T>
    ) {
        super(
            async () => {
                const library = await ibroadcastLibrary.load();
                const ids = await fetch();
                const items = ids
                    .map((id) =>
                        createMediaObject<T>(
                            section,
                            id,
                            library,
                            getSourceSorting(this.childSortId) || options?.childSort
                        )
                    )
                    // Remove any stubs.
                    .filter((item) => !!item.title);
                return {
                    items,
                    total: items.length,
                    atEnd: true,
                };
            },
            {pageSize: Infinity, ...options},
            createChildPager
        );
    }
}
