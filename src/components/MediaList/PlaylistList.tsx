import React from 'react';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaList, {MediaListProps} from './MediaList';

const defaultLayout: MediaSourceLayout<MediaPlaylist> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'TrackCount', 'Owner'],
};

export default function PlaylistList({
    className = '',
    layout = defaultLayout,
    ...props
}: MediaListProps<MediaPlaylist>) {
    return <MediaList {...props} className={`playlists ${className}`} layout={layout} />;
}
