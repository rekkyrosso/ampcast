import React, {useCallback} from 'react';
import MediaArtist from 'types/MediaArtist';
import MediaSourceLayout from 'types/MediaSourceLayout';
import {showMediaInfoDialog} from 'components/Media/MediaInfoDialog';
import MediaList, {MediaListProps} from './MediaList';
import showActionsMenu from './showActionsMenu';

const defaultLayout: MediaSourceLayout<MediaArtist> = {
    view: 'card minimal',
    fields: ['Thumbnail', 'Title'],
};

export default function ArtistList({
    className = '',
    layout = defaultLayout,
    ...props
}: MediaListProps<MediaArtist>) {
    const onContextMenu = useCallback(
        async ([artist]: readonly MediaArtist[], x: number, y: number) => {
            const action = await showActionsMenu([artist], x, y);
            switch (action) {
                case 'info':
                    showMediaInfoDialog(artist);
                    break;
            }
        },
        []
    );

    const onInfo = useCallback(([artist]: readonly MediaArtist[]) => {
        if (artist) {
            showMediaInfoDialog(artist);
        }
    }, []);

    return (
        <MediaList
            {...props}
            className={`artists ${className}`}
            layout={layout}
            onContextMenu={onContextMenu}
            onInfo={onInfo}
        />
    );
}
