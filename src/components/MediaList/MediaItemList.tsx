import React, {useCallback} from 'react';
import MediaItem from 'types/MediaItem';
import MediaSourceLayout from 'types/MediaSourceLayout';
import mediaPlayback from 'services/mediaPlayback';
import playlist from 'services/playlist';
import {showMediaInfoDialog} from 'components/Media/MediaInfoDialog';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useObservable from 'hooks/useObservable';
import MediaList, {MediaListProps} from './MediaList';
import showActionsMenu from './showActionsMenu';

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Artist', 'Title', 'Album', 'Track', 'Duration', 'Genre', 'PlayCount'],
};

export default function MediaItemList({
    className = '',
    layout = defaultLayout,
    unplayable,
    ...props
}: MediaListProps<MediaItem>) {
    const currentlyPlaying = useCurrentlyPlaying();
    const currentlyPlayingIndex = useObservable(playlist.observeCurrentIndex, -1);

    const itemClassName = useCallback(
        (item: MediaItem) => {
            const [source] = item.src.split(':');
            const playing = item.src === currentlyPlaying?.src ? 'playing' : '';
            const unplayable = item.unplayable ? 'unplayable' : '';
            return `source-${source} ${playing} ${unplayable}`;
        },
        [currentlyPlaying]
    );

    const onContextMenu = useCallback(
        async (items: readonly MediaItem[], x: number, y: number) => {
            const action = await showActionsMenu(items, x, y, unplayable);
            switch (action) {
                case 'play':
                    mediaPlayback.autoplay = true;
                    await playlist.insertAt(items, currentlyPlayingIndex + 1);
                    playlist.next();
                    break;

                case 'play-next':
                    await playlist.insertAt(items, currentlyPlayingIndex + 1);
                    break;

                case 'queue':
                    await playlist.add(items);
                    break;

                case 'info':
                    showMediaInfoDialog(items[0]);
                    break;
            }
        },
        [currentlyPlayingIndex, unplayable]
    );

    const onDoubleClick = useCallback(
        (item: MediaItem) => {
            if (!unplayable) {
                playlist.add(item);
            }
        },
        [unplayable]
    );

    const onEnter = useCallback(
        async (items: readonly MediaItem[], ctrlKey: boolean, shiftKey: boolean) => {
            if (!unplayable) {
                if (!ctrlKey && !shiftKey) {
                    // Queue
                    await playlist.add(items);
                } else if (ctrlKey && !shiftKey) {
                    // Play Now
                    mediaPlayback.autoplay = true;
                    await playlist.insertAt(items, currentlyPlayingIndex + 1);
                    playlist.next();
                } else if (shiftKey && !ctrlKey) {
                    // Play Next
                    await playlist.insertAt(items, currentlyPlayingIndex + 1);
                }
            }
        },
        [currentlyPlayingIndex, unplayable]
    );

    const onInfo = useCallback(([item]: readonly MediaItem[]) => {
        if (item) {
            showMediaInfoDialog(item);
        }
    }, []);

    return (
        <MediaList
            {...props}
            className={`media-items ${className}`}
            itemClassName={itemClassName}
            layout={layout}
            multiSelect={true}
            draggable={!unplayable}
            unplayable={unplayable}
            onContextMenu={onContextMenu}
            onDoubleClick={onDoubleClick}
            onEnter={onEnter}
            onInfo={onInfo}
        />
    );
}
