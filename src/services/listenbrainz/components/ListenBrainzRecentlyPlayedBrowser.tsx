import React, {useCallback} from 'react';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import RecentlyPlayedBrowser from 'components/MediaBrowser/RecentlyPlayedBrowser';
import useRecentlyPlayedPager from 'components/MediaBrowser/useRecentlyPlayedPager';
import ListenBrainzHistoryPager from '../ListenBrainzHistoryPager';

export interface ListenBrainzRecentlyPlayedBrowserProps {
    service: MediaService;
    source: MediaSource<MediaItem>;
}

export default function ListenBrainzRecentlyPlayedBrowser({
    service: listenbrainz,
    source: recentlyPlayed,
}: ListenBrainzRecentlyPlayedBrowserProps) {
    const createHistoryPager = useCallback((min_ts?: number, max_ts?: number) => {
        return new ListenBrainzHistoryPager(min_ts ? {min_ts} : {max_ts}, true);
    }, []);
    const {pager, total} = useRecentlyPlayedPager(createHistoryPager);

    return (
        <RecentlyPlayedBrowser
            service={listenbrainz}
            source={recentlyPlayed}
            pager={pager}
            total={total}
        />
    );
}
