import React, {useCallback} from 'react';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import scrobbleSettings from 'services/scrobbleSettings';
import ScrobblesBrowser from 'components/MediaBrowser/ScrobblesBrowser';
import useScrobblesPager from 'components/MediaBrowser/useScrobblesPager';
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
    const {pager, total} = useScrobblesPager(createHistoryPager, createNowPlayingPager, 20_000);

    return (
        <ScrobblesBrowser
            service={listenbrainz}
            source={scrobbles}
            title={total == null ? '' : `${total.toLocaleString()} listens`}
            pager={pager}
        />
    );
}
