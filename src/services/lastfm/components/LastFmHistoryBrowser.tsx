import React from 'react';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import HistoryBrowser from 'components/MediaBrowser/HistoryBrowser';
import useHistoryStart from './useHistoryStart';

export interface LastFmHistoryBrowserProps {
    service: MediaService;
    source: MediaSource<MediaItem>;
}

export default function LastFmHistoryBrowser({
    service: lastfm,
    source: history,
}: LastFmHistoryBrowserProps) {
    const minDate = useHistoryStart();

    return <HistoryBrowser service={lastfm} source={history} minDate={minDate} />;
}
