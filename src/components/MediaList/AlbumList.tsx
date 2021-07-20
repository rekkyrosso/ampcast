import React, {useCallback} from 'react';
import MediaAlbum from 'types/MediaAlbum';
import MediaSourceLayout from 'types/MediaSourceLayout';
import mediaPlayback from 'services/mediaPlayback';
import playlist from 'services/playlist';
import {showMediaInfoDialog} from 'components/Media/MediaInfoDialog';
import useObservable from 'hooks/useObservable';
import MediaList, {MediaListProps} from './MediaList';
import showActionsMenu from './showActionsMenu';

const defaultLayout: MediaSourceLayout<MediaAlbum> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'Artist', 'Year'],
};

export default function AlbumList({
    className = '',
    layout = defaultLayout,
    unplayable,
    ...props
}: MediaListProps<MediaAlbum>) {
    const currentlyPlayingIndex = useObservable(playlist.observeCurrentIndex, -1);

    const onContextMenu = useCallback(
        async ([album]: readonly MediaAlbum[], x: number, y: number) => {
            const action = await showActionsMenu([album], x, y, unplayable);
            switch (action) {
                case 'play':
                    mediaPlayback.autoplay = true;
                    await playlist.insertAt(album, currentlyPlayingIndex + 1);
                    mediaPlayback.next();
                    break;

                case 'play-next':
                    await playlist.insertAt(album, currentlyPlayingIndex + 1);
                    break;

                case 'queue':
                    playlist.add(album);
                    break;

                case 'info':
                    showMediaInfoDialog(album);
                    break;
            }
        },
        [currentlyPlayingIndex, unplayable]
    );

    const onDoubleClick = useCallback(
        (album: MediaAlbum) => {
            if (!unplayable) {
                playlist.add(album);
            }
        },
        [unplayable]
    );

    const onEnter = useCallback(
        async ([album]: readonly MediaAlbum[], ctrlKey: boolean, shiftKey: boolean) => {
            if (!unplayable) {
                if (!ctrlKey && !shiftKey) {
                    // Queue
                    playlist.add(album);
                } else if (ctrlKey && !shiftKey) {
                    // Play Now
                    mediaPlayback.autoplay = true;
                    await playlist.insertAt(album, currentlyPlayingIndex + 1);
                    mediaPlayback.next();
                } else if (shiftKey && !ctrlKey) {
                    // Play Next
                    await playlist.insertAt(album, currentlyPlayingIndex + 1);
                }
            }
        },
        [currentlyPlayingIndex, unplayable]
    );

    const onInfo = useCallback(([album]: readonly MediaAlbum[]) => {
        if (album) {
            showMediaInfoDialog(album);
        }
    }, []);

    return (
        <MediaList
            {...props}
            className={`albums ${className}`}
            layout={layout}
            draggable={!unplayable}
            unplayable={unplayable}
            onContextMenu={onContextMenu}
            onDoubleClick={onDoubleClick}
            onEnter={onEnter}
            onInfo={onInfo}
        />
    );
}
