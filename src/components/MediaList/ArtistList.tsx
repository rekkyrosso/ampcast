import React from 'react';
import MediaArtist from 'types/MediaArtist';
import MediaList, {MediaListProps} from './MediaList';
import {artistsLayout} from './layouts';

export default function ArtistList({
    className = '',
    defaultLayout = artistsLayout,
    ...props
}: MediaListProps<MediaArtist>) {
    return (
        <MediaList {...props} className={`artists ${className}`} defaultLayout={defaultLayout} />
    );
}
