import React from 'react';
import HistoryBrowser from 'components/MediaBrowser/HistoryBrowser';
import {listenbrainzHistory} from '../listenbrainz';
import useHistoryStart from './useHistoryStart';

export default function ListenBrainzHistoryBrowser() {
    const minDate = useHistoryStart();

    return <HistoryBrowser source={listenbrainzHistory} minDate={minDate} />;
}
