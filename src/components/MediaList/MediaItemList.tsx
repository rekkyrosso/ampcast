import React from 'react';
import MediaItem from 'types/MediaItem';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaList, {MediaListProps} from './MediaList';

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Artist', 'Title', 'Album', 'Track', 'Duration', 'Genre', 'PlayCount'],
};

export default function MediaItemList({
    className = '',
    layout = defaultLayout,
    multiple = true,
    draggable = true,
    ...props
}: MediaListProps<MediaItem>) {
    return (
        <MediaList
            {...props}
            className={`media-items ${className}`}
            layout={layout}
            multiple={multiple}
            draggable={draggable}
        />
    );
}
