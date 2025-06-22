import React from 'react';
import MediaItem from 'types/MediaItem';
import MediaItemList from 'components/MediaList/MediaItemList';
import {PagedItemsProps} from './PagedItems';

export default function MediaItems({source, ...props}: PagedItemsProps<MediaItem>) {
    return (
        <div className="panel">
            <MediaItemList
                {...props}
                title={source.title}
                layoutOptions={source.primaryItems?.layout}
                source={source}
            />
        </div>
    );
}
