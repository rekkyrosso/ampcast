import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import lastfmSettings from './lastfmSettings';
import LastFmPager, {LastFmPagerConfig} from './LastFmPager';

export interface LastFmHistoryPagerParams {
    from?: number;
    to?: number;
    limit?: number;
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
                const total = Number(attr.total) || undefined;
                const atEnd = attr.page === attr.totalPages;
                if (containsNowPlaying) {
                    items.shift();
                }
                return {items, total, atEnd, itemType: ItemType.Media};
            },
            config
        );
    }
}
