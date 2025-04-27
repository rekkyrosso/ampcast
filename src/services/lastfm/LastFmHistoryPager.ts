import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import lastfmSettings from './lastfmSettings';
import LastFmPager, {LastFmPagerConfig} from './LastFmPager';

export interface LastFmHistoryPagerParams {
    from?: number;
    to?: number;
    limit?: number;
    page?: number;
}

export default class LastFmHistoryPager extends LastFmPager<MediaItem> {
    constructor(
        type: 'listens' | 'now-playing',
        params?: LastFmHistoryPagerParams,
        config?: LastFmPagerConfig
    ) {
        super(
            {
                ...params,
                method: 'user.getRecentTracks',
                extended: '1',
                user: lastfmSettings.userId,
            },
            ({recenttracks}: any) => {
                const isNowPlaying = type === 'now-playing';
                const attr = recenttracks['@attr'] || {};
                const track = recenttracks.track;
                let items = track ? (Array.isArray(track) ? track : [track]) : [];
                const page = Number(attr.page) || 1;
                const totalPages = Number(attr.totalPages) || 1;
                const atEnd = isNowPlaying || totalPages === 1 || page === totalPages;
                const total = Number(attr.total) || undefined;
                if (isNowPlaying) {
                    const item = items.find((item) => item['@attr']?.nowplaying);
                    items = item ? [item] : [];
                } else {
                    while (items[0]?.['@attr']?.nowplaying) {
                        items.shift();
                    }
                }
                return {items, total, atEnd, itemType: ItemType.Media};
            },
            {pageSize: type === 'now-playing' ? 1 : 50, ...config}
        );
    }
}
