import React from 'react';
import MediaItem from 'types/MediaItem';
import MediaItemList from 'components/MediaList/MediaItemList';
import {PagedItemsProps} from './PagedItems';

export default function MediaItems({source, ...props}: PagedItemsProps<MediaItem>) {
    return (
        <div className="panel">
            <MediaItemList
                {...props}
                storageId={source.id}
                title={source.title}
                reportingId={source.id}
            />
        </div>
    );
}
