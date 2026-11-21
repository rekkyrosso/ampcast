import MediaItem from 'types/MediaItem';
import RecentlyPlayedPager from 'services/pagers/RecentlyPlayedPager';
import soundcloudApi from './soundcloudApi';
import {createMediaObjects} from './soundcloudUtils';

export default class SoundCloudRecentlyPlayedPager extends RecentlyPlayedPager {
    constructor() {
        super(
            async () => {
                const {collection} = await soundcloudApi.get<
                    SoundCloud.PaginatedResponse<SoundCloud.MediaObject>
                >(`me/recently-played/tracks?linked_partitioning=true&limit=50`);
                const items = createMediaObjects<MediaItem>(collection);
                return {
                    items,
                    total: items.length,
                    atEnd: true,
                };
            },
            {pageSize: 200}
        );
    }
}
