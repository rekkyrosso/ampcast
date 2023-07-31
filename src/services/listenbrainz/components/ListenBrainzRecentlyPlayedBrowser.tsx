import React, {useCallback} from 'react';
import RecentlyPlayedBrowser from 'components/MediaBrowser/RecentlyPlayedBrowser';
import useRecentlyPlayedPager from 'components/MediaBrowser/useRecentlyPlayedPager';
import listenbrainz, {listenbrainzRecentlyPlayed} from '../listenbrainz';
import ListenBrainzHistoryPager from '../ListenBrainzHistoryPager';

export default function ListenBrainzRecentlyPlayedBrowser() {
    const createHistoryPager = useCallback((min_ts?: number, max_ts?: number) => {
        return new ListenBrainzHistoryPager(min_ts ? {min_ts} : {max_ts}, true);
    }, []);
    const {pager, total} = useRecentlyPlayedPager(createHistoryPager);

    return (
        <RecentlyPlayedBrowser
            service={listenbrainz}
            source={listenbrainzRecentlyPlayed}
            pager={pager}
            total={total}
        />
    );
}
