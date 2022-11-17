import React from 'react';
import {lastfmHistory} from 'services/lastfm';
import HistoryBrowser from 'components/MediaBrowser/HistoryBrowser';
import useHistoryStart from './useHistoryStart';

export default function LastFmHistoryBrowser() {
    const minDate = useHistoryStart();

    return <HistoryBrowser source={lastfmHistory} minDate={minDate} />;
}
