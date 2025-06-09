import React from 'react';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaList, {MediaListProps} from './MediaList';
import {playlistsLayout} from './layouts';

export default function PlaylistList({
    className = '',
    defaultLayout = playlistsLayout,
    ...props
}: MediaListProps<MediaPlaylist>) {
    return (
        <MediaList {...props} className={`playlists ${className}`} defaultLayout={defaultLayout} />
    );
}
