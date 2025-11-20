import {mergeMap} from 'rxjs';
import MediaItem from 'types/MediaItem';
import {Page} from 'types/Pager';
import {Logger} from 'utils';
import RecentlyPlayedPager from 'services/pagers/RecentlyPlayedPager';
import {createMediaObjects, musicKitFetch} from './musicKitUtils';
import MusicKitPager from './MusicKitPager';
import {addUserData} from './apple';

const logger = new Logger('MusicKitRecentlyPlayedPager');

export default class MusicKitRecentlyPlayedPager extends RecentlyPlayedPager {
    constructor() {
        super(
            async (offset: number, limit: number): Promise<Page<MediaItem>> => {
                const response = await musicKitFetch('/v1/me/recent/played/tracks', {
                    offset,
                    limit,
                });
                const result = MusicKitPager.toPage(response.data);
                const items = createMediaObjects<MediaItem>(result.items);
                const total = result.total;
                const atEnd = !!this.size || items.length < limit;
                return {items, total, atEnd};
            },
            {pageSize: 30, maxSize: 200}
        );
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();

            this.subscribeTo(
                this.observeAdditions().pipe(mergeMap((items) => addUserData(items))),
                logger
            );
        }
    }
}
