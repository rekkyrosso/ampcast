import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import RecentlyPlayedPager from 'services/pagers/RecentlyPlayedPager';
import navidromeApi from './navidromeApi';
import navidromeSettings from './navidromeSettings';
import {createMediaObject} from './navidromeUtils';

export default class NavidromeRecentlyPlayedPager extends RecentlyPlayedPager {
    constructor() {
        super(
            async (offset, count) => {
                const page = await navidromeApi.getPage<Navidrome.Song>('song', {
                    library_id: navidromeSettings.libraryId,
                    _start: offset,
                    _end: offset + count,
                    _sort: 'play_date',
                    _order: 'DESC',
                });
                const items = page.items
                    .filter((item) => !!item.playCount)
                    .map((item) => createMediaObject<MediaItem>(ItemType.Media, item));
                const atEnd = !!this.size || items.length < count;
                return {items, atEnd};
            },
            {pageSize: 200}
        );
    }
}
