import {debounceTime, interval, merge, mergeMap, skip} from 'rxjs';
import MediaItem from 'types/MediaItem';
import {Page, PagerConfig} from 'types/Pager';
import {Logger, partition} from 'utils';
import {observeListens} from 'services/localdb/listens';
import {observePlaybackStart} from 'services/mediaPlayback/playback';
import SequentialPager from './SequentialPager';

const logger = new Logger('RecentlyPlayedPager');

export default class RecentlyPlayedPager extends SequentialPager<MediaItem> {
    constructor(
        private readonly _fetchAt: (offset: number, count: number) => Promise<Page<MediaItem>>,
        options: PagerConfig<MediaItem>
    ) {
        super(async (pageSize: number) => _fetchAt(this.items.length, pageSize), options);
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();

            this.subscribeTo(
                merge(
                    observePlaybackStart(),
                    observeListens().pipe(skip(1)),
                    interval(30_000)
                ).pipe(
                    debounceTime(10_000),
                    mergeMap(() => this.refresh())
                ),
                logger
            );
        }
    }

    private async refresh(): Promise<void> {
        try {
            const maxItems = 5;
            const {items: allItems, atEnd, total} = await this._fetchAt(0, maxItems);
            if (total) {
                this.size = total;
            }
            let items = allItems.slice(0, maxItems);
            const itemKey = this.itemKey;
            const keys = items.map((item) => item[itemKey]);
            const [newItems, oldItems] = partition(this.items, (item) =>
                keys.includes(item[itemKey])
            );
            // Try to retain previous items. They may have additional metadata and thumbnails.
            items = items
                .map((item) => {
                    const newItem = newItems.find((newItem) => newItem[itemKey] === item[itemKey]);
                    if (newItem) {
                        return {...newItem, playedAt: item.playedAt};
                    } else {
                        return item;
                    }
                })
                .concat(oldItems);
            if (atEnd) {
                this.size = items.length;
            }
            this.items = items;
        } catch (err) {
            logger.log(err);
        }
    }
}
