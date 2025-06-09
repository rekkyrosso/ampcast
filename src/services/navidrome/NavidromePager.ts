import {tap} from 'rxjs';
import {Primitive} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import SortParams from 'types/SortParams';
import {PagerConfig} from 'types/Pager';
import {Logger} from 'utils';
import {getSourceSorting, observeSourceSorting} from 'services/mediaServices/servicesSettings';
import OffsetPager from 'services/pagers/OffsetPager';
import navidromeApi from './navidromeApi';
import navidromeUtils from './navidromeUtils';

const logger = new Logger('NavidromePager');

interface NavidromePagerConfig extends PagerConfig {
    readonly childSort?: SortParams;
    readonly childSortId?: string;
}

export default class NavidromePager<T extends MediaObject> extends OffsetPager<T> {
    static minPageSize = 10;
    static maxPageSize = 500;

    private readonly childSortId: string;

    constructor(
        itemType: T['itemType'],
        path: string,
        params?: Record<string, Primitive>,
        options?: Partial<NavidromePagerConfig>
    ) {
        const {childSort, childSortId = '', ...config} = options || {};
        super(
            async (pageNumber, pageSize) => {
                const _start = (pageNumber - 1) * pageSize;
                const _end = _start + pageSize;
                const {items, total} = await navidromeApi.getPage(path, {
                    ...params,
                    _start,
                    _end,
                });
                return {
                    items: items.map((item) =>
                        navidromeUtils.createMediaObject(
                            itemType,
                            item,
                            path === 'radio',
                            getSourceSorting(childSortId) || childSort
                        )
                    ),
                    total,
                };
            },
            {pageSize: 200, ...config}
        );
        this.childSortId = childSortId;
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();

            if (this.childSortId) {
                this.subscribeTo(
                    observeSourceSorting(this.childSortId).pipe(
                        tap((childSort) => this.updateChildSort(childSort))
                    ),
                    logger
                );
            }
        }
    }

    private updateChildSort(childSort: SortParams | undefined): void {
        this.items = this.items.map((item) => {
            if (item.itemType === ItemType.Artist) {
                item.pager.disconnect();
                return {
                    ...item,
                    pager: navidromeUtils.createArtistAlbumsPager(item, childSort),
                };
            } else if (item.itemType === ItemType.Playlist) {
                item.pager.disconnect();
                return {
                    ...item,
                    pager: navidromeUtils.createPlaylistItemsPager(item, childSort),
                };
            } else {
                return item;
            }
        });
    }
}
