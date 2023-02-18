import React, {useCallback, useState} from 'react';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaSourceLayout from 'types/MediaSourceLayout';
import DatePicker from 'components/DatePicker';
import {PagedBrowserProps} from './MediaBrowser';
import MediaItemBrowser from './MediaItemBrowser';
import PageHeader from './PageHeader';
import useHistoryPager from './useHistoryPager';

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'ListenDate'],
};

export interface HistoryBrowserProps extends PagedBrowserProps<MediaItem> {
    service: MediaService;
    minDate?: string; // yyyy-mm-dd
}

export default function HistoryBrowser({
    service,
    source,
    minDate = '2010-01-1',
    ...props
}: HistoryBrowserProps) {
    const [startAt, setStartAt] = useState(0);
    const pager = useHistoryPager(source, startAt);

    const handleDateChange = useCallback((value: string) => {
        const today = new Date();
        const date = new Date(value);
        if (
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate()
        ) {
            setStartAt(0);
        } else {
            setStartAt(Math.floor(date.valueOf() / 1000));
        }
    }, []);

    return (
        <>
            <PageHeader icon={service.icon}>
                {service.name}:
                <DatePicker min={minDate} onSelect={handleDateChange} />
            </PageHeader>
            <MediaItemBrowser
                {...props}
                className="history-browser"
                source={source}
                pager={pager}
                layout={source.layout || defaultLayout}
            />
        </>
    );
}
