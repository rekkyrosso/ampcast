import React from 'react';
import HistoryBrowser from 'components/MediaBrowser/HistoryBrowser';
import lastfm, {lastfmHistory} from '../lastfm';
import useHistoryStart from './useHistoryStart';

export default function LastFmHistoryBrowser() {
    const minDate = useHistoryStart();

    return <HistoryBrowser service={lastfm} source={lastfmHistory} minDate={minDate} />;
}
