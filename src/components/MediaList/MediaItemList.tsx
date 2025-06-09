import React from 'react';
import MediaItem from 'types/MediaItem';
import MediaList, {MediaListProps} from './MediaList';
import {mediaItemsLayout} from './layouts';

export default function MediaItemList({
    className = '',
    defaultLayout = mediaItemsLayout,
    multiple = true,
    draggable = true,
    ...props
}: MediaListProps<MediaItem>) {
    return (
        <MediaList
            {...props}
            className={`media-items ${className}`}
            defaultLayout={defaultLayout}
            multiple={multiple}
            draggable={draggable}
        />
    );
}
