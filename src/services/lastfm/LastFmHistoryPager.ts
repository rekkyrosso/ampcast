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
    constructor(params?: LastFmHistoryPagerParams, config?: LastFmPagerConfig) {
        super(
            {
                ...params,
                method: 'user.getRecentTracks',
                extended: '1',
                user: lastfmSettings.userId,
            },
            ({recenttracks}: any) => {
                const attr = recenttracks['@attr'] || {};
                const track = recenttracks.track;
                const items = track ? (Array.isArray(track) ? track : [track]) : [];
                const containsNowPlaying = items[0]?.['@attr']?.['nowplaying'] === 'true';
                const page = Number(attr.page) || 1;
                const totalPages = Number(attr.totalPages) || 1;
                const atEnd = totalPages === 1 || page === totalPages;
                const total = Number(attr.total) || undefined;
                if (containsNowPlaying) {
                    items.shift();
                }
                return {items, total, atEnd, itemType: ItemType.Media};
            },
            config
        );
    }
}
