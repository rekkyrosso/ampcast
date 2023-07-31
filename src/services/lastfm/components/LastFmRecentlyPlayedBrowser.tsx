import React, {useCallback} from 'react';
import RecentlyPlayedBrowser from 'components/MediaBrowser/RecentlyPlayedBrowser';
import useRecentlyPlayedPager from 'components/MediaBrowser/useRecentlyPlayedPager';
import LastFmHistoryPager from '../LastFmHistoryPager';
import lastfm, {lastfmRecentlyPlayed} from '../lastfm';

export default function LastFmRecentlyPlayedBrowser() {
    const createHistoryPager = useCallback((from?: number, to?: number) => {
        return new LastFmHistoryPager(from ? {from} : {to});
    }, []);
    const {pager, total} = useRecentlyPlayedPager(createHistoryPager);

    return (
        <RecentlyPlayedBrowser
            service={lastfm}
            source={lastfmRecentlyPlayed}
            pager={pager}
            total={total}
        />
    );
}
