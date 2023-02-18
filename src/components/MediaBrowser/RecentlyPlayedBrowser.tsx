import React, {useEffect, useReducer} from 'react';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaSourceLayout from 'types/MediaSourceLayout';
import {PagedBrowserProps} from './MediaBrowser';
import MediaItemBrowser from './MediaItemBrowser';
import PageHeader from './PageHeader';

export interface RecentlyPlayedBrowserProps extends PagedBrowserProps<MediaItem> {
    service: MediaService;
    total?: number;
}

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'LastPlayed'],
};

export default function RecentlyPlayedBrowser({
    service,
    source,
    total,
    ...props
}: RecentlyPlayedBrowserProps) {
    const [, forceUpdate] = useReducer((i) => i + 1, 0);

    useEffect(() => {
        // Make sure the "last played" fields are updated.
        const id = setInterval(forceUpdate, 60_000);
        return () => clearInterval(id);
    }, []);

    return (
        <>
            <PageHeader icon={service.icon}>
                {total === undefined ? (
                    service.name
                ) : (
                    <>
                        {service.name}: {total.toLocaleString()} scrobbles
                    </>
                )}
            </PageHeader>
            <MediaItemBrowser
                {...props}
                className="recently-played-browser"
                source={source}
                layout={source.layout || defaultLayout}
            />
        </>
    );
}
