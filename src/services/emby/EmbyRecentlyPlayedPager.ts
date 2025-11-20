import RecentlyPlayedPager from 'services/pagers/RecentlyPlayedPager';
import embyApi from './embyApi';
import embySettings from './embySettings';
import {createMediaObject} from './embyUtils';

export default class EmbyRecentlyPlayedPager extends RecentlyPlayedPager {
    constructor() {
        super(
            async (offset, count) => {
                const page = await embyApi.getPage(`Users/${embySettings.userId}/Items`, {
                    ParentId: embySettings.libraryId,
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
