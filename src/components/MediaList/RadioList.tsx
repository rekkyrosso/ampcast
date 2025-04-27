import React from 'react';
import MediaItem from 'types/MediaItem';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaList, {MediaListProps} from './MediaList';

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Location', 'Blurb'],
};

export default function RadioList({
    className = '',
    layout = defaultLayout,
    draggable = true,
    multiple = true,
    ...props
}: MediaListProps<MediaItem>) {
    return (
        <MediaList
            {...props}
            className={`radios ${className}`}
            layout={layout}
            draggable={draggable}
            multiple={multiple}
        />
    );
}
