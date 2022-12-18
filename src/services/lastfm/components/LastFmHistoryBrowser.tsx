import React from 'react';
import HistoryBrowser from 'components/MediaBrowser/HistoryBrowser';
import {lastfmHistory} from '../lastfm';
import useHistoryStart from './useHistoryStart';

export default function LastFmHistoryBrowser() {
    const minDate = useHistoryStart();

    return <HistoryBrowser source={lastfmHistory} minDate={minDate} />;
}
