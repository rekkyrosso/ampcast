import React, {useCallback} from 'react';
import Action from 'types/Action';
import MediaPlaylist from 'types/MediaPlaylist';
import {performAction} from 'components/Actions';
import MediaList, {MediaListProps} from './MediaList';
import {playlistsLayout} from './layouts';

export default function PlaylistList({
    source,
    className = '',
    defaultLayout = playlistsLayout,
    ...props
}: MediaListProps<MediaPlaylist>) {
    const handleDelete = useCallback(
        ([playlist]: readonly MediaPlaylist[]) => {
            if (playlist.deletable && !source?.isPin) {
                performAction(Action.DeletePlaylist, [playlist]);
            }
        },
        [source]
    );

    return (
        <MediaList
            {...props}
            className={`playlists ${className}`}
            source={source}
            defaultLayout={defaultLayout}
            onDelete={handleDelete}
        />
    );
}
