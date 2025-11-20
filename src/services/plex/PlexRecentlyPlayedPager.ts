import MediaItem from 'types/MediaItem';
import RecentlyPlayedPager from 'services/pagers/RecentlyPlayedPager';
import plexApi, {getMusicLibraryPath} from './plexApi';
import plexMediaType from './plexMediaType';
import {createMediaObjects, getMediaAlbums, getMetadata} from './plexUtils';

export default class PlexRecentlyPlayedPager extends RecentlyPlayedPager {
    constructor() {
        super(
            async (offset, count) => {
                const page = await plexApi.getPage(
                    {
                        path: getMusicLibraryPath(),
                        params: {
                            type: plexMediaType.Track,
                            'lastViewedAt>': '0',
                            sort: 'lastViewedAt:desc',
                        },
                    },
                    offset,
                    count
                );
                const [plexItems, albums] = await Promise.all([
                    getMetadata(page.items),
                    getMediaAlbums(page.items),
                ]);
                const items = createMediaObjects<MediaItem>(plexItems, undefined, albums);
                return {items, total: page.total};
            },
            {pageSize: 200}
        );
    }
}
