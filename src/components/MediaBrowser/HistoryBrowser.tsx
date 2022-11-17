import React, {useCallback, useEffect, useReducer, useState} from 'react';
import MediaItem from 'types/MediaItem';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import DatePicker from 'components/DatePicker';
import useSource from 'hooks/useSource';
import {PagedBrowserProps} from './MediaBrowser';
import MediaItemBrowser from './MediaItemBrowser';

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'LastPlayed'],
};

const dateLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'ListenDate'],
};

export interface HistoryBrowserProps extends PagedBrowserProps<MediaItem> {
    minDate?: number; // JS time
}

export default function HistoryBrowser({
    source,
    minDate = Date.UTC(2010, 0, 1),
    ...props
}: HistoryBrowserProps) {
    const [startAt, setStartAt] = useState(0);
    const startNow = startAt === 0;
    const pager = usePager(source, startAt);
    const layout = source.layout || (startAt ? dateLayout : defaultLayout);
    const [, forceUpdate] = useReducer((i) => i + 1, 0);

    useEffect(() => {
        if (startNow) {
            const id = setInterval(forceUpdate, 60_000);
            return () => clearInterval(id);
        }
    }, [startNow]);

    const handleDateChange = useCallback((value: number) => {
        const today = new Date();
        const date = new Date(value);
        if (
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate()
        ) {
            setStartAt(0);
        } else {
            setStartAt(Math.floor(value / 1000));
        }
    }, []);

    return (
        <>
            <DatePicker min={minDate} onSelect={handleDateChange} />
            <MediaItemBrowser
                {...props}
                className="history-browser"
                source={source}
                pager={pager}
                layout={layout}
            />
        </>
    );
}

function usePager(source: MediaSource<MediaItem> | null, startAt = 0) {
    const [params, setParams] = useState<{startAt: number}>();
    const pager = useSource(source, params);
    useEffect(() => setParams({startAt}), [startAt]);
    return pager;
}
