import React from 'react';
import MediaAlbum from 'types/MediaAlbum';
import MediaList, {MediaListProps} from './MediaList';
import {albumsLayout} from './layouts';

export default function AlbumList({
    className = '',
    defaultLayout = albumsLayout,
    draggable = true,
    ...props
}: MediaListProps<MediaAlbum>) {
    return (
        <MediaList
            {...props}
            className={`albums ${className}`}
            defaultLayout={defaultLayout}
            draggable={draggable}
        />
    );
}
