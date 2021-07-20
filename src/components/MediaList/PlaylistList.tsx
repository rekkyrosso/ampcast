import React, {useCallback} from 'react';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSourceLayout from 'types/MediaSourceLayout';
import {showMediaInfoDialog} from 'components/Media/MediaInfoDialog';
import MediaList, {MediaListProps} from './MediaList';
import showActionsMenu from './showActionsMenu';

const defaultLayout: MediaSourceLayout<MediaPlaylist> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'TrackCount', 'Owner'],
};

export default function PlaylistList({
    className = '',
    layout = defaultLayout,
    unplayable,
    ...props
}: MediaListProps<MediaPlaylist>) {
    const onContextMenu = useCallback(
        async ([item]: readonly MediaPlaylist[], x: number, y: number) => {
            const action = await showActionsMenu([item], x, y, unplayable);
            switch (action) {
                case 'info':
                    showMediaInfoDialog(item);
                    break;
            }
        },
        [unplayable]
    );

    const onInfo = useCallback(([playlist]: readonly MediaPlaylist[]) => {
        if (playlist) {
            showMediaInfoDialog(playlist);
        }
    }, []);

    return (
        <MediaList
            {...props}
            className={`playlists ${className}`}
            layout={layout}
            unplayable={unplayable}
            onContextMenu={onContextMenu}
            onInfo={onInfo}
        />
    );
}
