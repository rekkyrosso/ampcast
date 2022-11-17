import React from 'react';
import {listenbrainzHistory} from 'services/listenbrainz';
import HistoryBrowser from 'components/MediaBrowser/HistoryBrowser';
import useHistoryStart from './useHistoryStart';

export default function ListenBrainzHistoryBrowser() {
    const minDate = useHistoryStart();

    return <HistoryBrowser source={listenbrainzHistory} minDate={minDate} />;
}
