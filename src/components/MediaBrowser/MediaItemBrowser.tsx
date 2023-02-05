import React from 'react';
import MediaItem from 'types/MediaItem';
import MediaItemList from 'components/MediaList/MediaItemList';
import {PagedBrowserProps} from './MediaBrowser';

export default function MediaItemBrowser({className = '', ...props}: PagedBrowserProps<MediaItem>) {
    return (
        <div className={`panel media-item-browser ${className}`}>
            <MediaItemList {...props} />;
        </div>
    );
}
