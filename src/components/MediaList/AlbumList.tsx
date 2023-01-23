import React from 'react';
import MediaAlbum from 'types/MediaAlbum';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaList, {MediaListProps} from './MediaList';

const defaultLayout: MediaSourceLayout<MediaAlbum> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'Artist', 'Year'],
};

export default function AlbumList({
    className = '',
    layout = defaultLayout,
    ...props
}: MediaListProps<MediaAlbum>) {
    return (
        <MediaList {...props} className={`albums ${className}`} layout={layout} draggable={true} />
    );
}
