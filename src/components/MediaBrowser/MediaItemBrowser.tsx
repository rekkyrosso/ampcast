import React from 'react';
import MediaItem from 'types/MediaItem';
import MediaItemList from 'components/MediaList/MediaItemList';
import {PagedBrowserProps} from './MediaBrowser';

export default function MediaItemBrowser({source, ...props}: PagedBrowserProps<MediaItem>) {
    return (
        <div className="panel media-item-browser">
            <MediaItemList {...props} unplayable={source.unplayable} />;
        </div>
    );
}
