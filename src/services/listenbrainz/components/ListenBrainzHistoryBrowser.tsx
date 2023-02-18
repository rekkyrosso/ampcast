import React from 'react';
import HistoryBrowser from 'components/MediaBrowser/HistoryBrowser';
import listenbrainz, {listenbrainzHistory} from '../listenbrainz';
import useHistoryStart from './useHistoryStart';

export default function ListenBrainzHistoryBrowser() {
    const minDate = useHistoryStart();

    return <HistoryBrowser service={listenbrainz} source={listenbrainzHistory} minDate={minDate} />;
}
