import React, {useCallback} from 'react';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import RecentlyPlayedBrowser from 'components/MediaBrowser/RecentlyPlayedBrowser';
import useRecentlyPlayedPager from 'components/MediaBrowser/useRecentlyPlayedPager';
import LastFmHistoryPager from '../LastFmHistoryPager';

export interface LastFmScrobblesBrowserProps {
    service: MediaService;
    source: MediaSource<MediaItem>;
}

export default function LastFmScrobblesBrowser({
    service: lastfm,
    source: scrobbles,
}: LastFmScrobblesBrowserProps) {
    const createHistoryPager = useCallback((from?: number, to?: number) => {
        return new LastFmHistoryPager(from ? {from} : {to});
    }, []);
    const {pager, total} = useRecentlyPlayedPager(createHistoryPager);

    return (
        <RecentlyPlayedBrowser service={lastfm} source={scrobbles} pager={pager} total={total} />
    );
}
