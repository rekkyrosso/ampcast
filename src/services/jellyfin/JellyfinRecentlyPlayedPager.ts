import RecentlyPlayedPager from 'services/pagers/RecentlyPlayedPager';
import jellyfinApi, {getMusicLibraryId} from './jellyfinApi';
import jellyfinSettings from './jellyfinSettings';
import {createMediaObject} from './jellyfinUtils';

export default class JellyfinRecentlyPlayedPager extends RecentlyPlayedPager {
    constructor() {
        super(
            async (offset, count) => {
                const page = await jellyfinApi.getPage(`Users/${jellyfinSettings.userId}/Items`, {
                    ParentId: getMusicLibraryId(),
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
