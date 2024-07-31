import React from 'react';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import HistoryBrowser from 'components/MediaBrowser/HistoryBrowser';
import useHistoryStart from './useHistoryStart';

export interface ListenBrainzHistoryBrowserProps {
    service: MediaService;
    source: MediaSource<MediaItem>;
}

export default function ListenBrainzHistoryBrowser({
    service: listenbrainz,
    source: history,
}: ListenBrainzHistoryBrowserProps) {
    const minDate = useHistoryStart();

    return <HistoryBrowser service={listenbrainz} source={history} minDate={minDate} />;
}
