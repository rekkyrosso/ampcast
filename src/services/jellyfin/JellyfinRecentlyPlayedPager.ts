import RecentlyPlayedPager from 'services/pagers/RecentlyPlayedPager';
import jellyfinApi from './jellyfinApi';
import jellyfinSettings from './jellyfinSettings';
import {createMediaObject} from './jellyfinUtils';

export default class JellyfinRecentlyPlayedPager extends RecentlyPlayedPager {
    constructor() {
        super(
            async (offset, count) => {
                const page = await jellyfinApi.getPage(`Users/${jellyfinSettings.userId}/Items`, {
                    ParentId: jellyfinSettings.libraryId,
                    SortBy: 'DatePlayed',
                    SortOrder: 'Descending',
                    Filters: 'IsPlayed',
                    Limit: count,
                    StartIndex: offset,
                });
                return {
                    ...page,
                    items: page.items.map((item) => createMediaObject(item)),
                };
            },
            {pageSize: 200}
        );
    }
}
