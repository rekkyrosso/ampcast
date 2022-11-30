import React, {useEffect, useReducer} from 'react';
import MediaItem from 'types/MediaItem';
import MediaSourceLayout from 'types/MediaSourceLayout';
import {PagedBrowserProps} from './MediaBrowser';
import MediaItemBrowser from './MediaItemBrowser';

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'LastPlayed'],
};

export default function RecentlyPlayedBrowser({source, ...props}: PagedBrowserProps<MediaItem>) {
    const [, forceUpdate] = useReducer((i) => i + 1, 0);

    useEffect(() => {
        const id = setInterval(forceUpdate, 60_000);
        return () => clearInterval(id);
    }, []);

    return (
        <MediaItemBrowser
            {...props}
            className="recently-played-browser"
            source={source}
            layout={source.layout || defaultLayout}
        />
    );
}
