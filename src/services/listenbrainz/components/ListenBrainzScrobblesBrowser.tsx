import React, {useCallback} from 'react';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import scrobbleSettings from 'services/scrobbleSettings';
import RecentlyPlayedBrowser from 'components/MediaBrowser/RecentlyPlayedBrowser';
import useRecentlyPlayedPager from 'components/MediaBrowser/useRecentlyPlayedPager';
import ListenBrainzHistoryPager from '../ListenBrainzHistoryPager';

export interface ListenBrainzScrobblesBrowserProps {
    service: MediaService;
    source: MediaSource<MediaItem>;
}

export default function ListenBrainzScrobblesBrowser({
    service: listenbrainz,
    source: scrobbles,
}: ListenBrainzScrobblesBrowserProps) {
    const createHistoryPager = useCallback((min_ts?: number, max_ts?: number) => {
        return new ListenBrainzHistoryPager('listens', min_ts ? {min_ts} : {max_ts}, true);
    }, []);
    const createNowPlayingPager = useCallback(() => {
        if (scrobbleSettings.canUpdateNowPlaying('listenbrainz')) {
            return new ListenBrainzHistoryPager('playing-now');
        }
    }, []);
    const {pager, total} = useRecentlyPlayedPager(createHistoryPager, createNowPlayingPager);

    return (
        <RecentlyPlayedBrowser
            service={listenbrainz}
            source={scrobbles}
            pager={pager}
            total={total}
        />
    );
}
