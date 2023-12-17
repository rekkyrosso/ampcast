import React, {useCallback, useState} from 'react';
import {Except} from 'type-fest';
import LookupStatus from 'types/LookupStatus';
import PlaylistItem from 'types/PlaylistItem';
import playlist from 'services/playlist';
import ListView, {ListViewHandle, ListViewProps} from 'components/ListView';
import MediaListStatusBar from 'components/MediaList/MediaListStatusBar';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useObservable from 'hooks/useObservable';
import {showMediaInfoDialog} from 'components/MediaInfo/MediaInfoDialog';
import showActionsMenu from './showActionsMenu';
import usePlaylistLayout from './usePlaylistLayout';
import './Playlist.scss';

export const droppableTypes = ['audio/*', 'video/*'];

type NotRequired = 'items' | 'itemKey' | 'title' | 'layout' | 'sortable' | 'droppableTypes';

export interface PlaylistProps extends Except<ListViewProps<PlaylistItem>, NotRequired> {
    onPlay?: (item: PlaylistItem) => void;
    onEject?: () => void;
    listViewRef: React.MutableRefObject<ListViewHandle | null>;
}

export default function Playlist({
    onSelect,
    onPlay,
    onEject,
    listViewRef,
    ...props
}: PlaylistProps) {
    const items = useObservable(playlist.observe, []);
    const size = items.length;
    const layout = usePlaylistLayout(size);
    const item = useCurrentlyPlaying();
    const currentId = item?.id;
    const [selectedCount, setSelectedCount] = useState(0);

    const itemClassName = useCallback(
        (item: PlaylistItem) => {
            const [service] = item.src.split(':');
            const playing = item.id === currentId;
            const unplayable = item.unplayable || item.lookupStatus === LookupStatus.NotFound;
            return `source-${service} ${playing ? 'playing' : ''} ${
                unplayable ? 'unplayable' : ''
            }`;
        },
        [currentId]
    );

    const handleSelect = useCallback(
        (items: readonly PlaylistItem[]) => {
            setSelectedCount(items.length);
            onSelect?.(items);
        },
        [onSelect]
    );

    const handleDoubleClick = useCallback(
        (item: PlaylistItem) => {
            onPlay?.(item);
        },
        [onPlay]
    );

    const handleEnter = useCallback(
        (items: readonly PlaylistItem[]) => {
            if (items.length === 1) {
                onPlay?.(items[0]);
            }
        },
        [onPlay]
    );

    const handleDelete = useCallback(
        (items: readonly PlaylistItem[]) => {
            if (items.length === 1 && items[0].id === currentId) {
                onEject?.();
            } else {
                playlist.remove(items);
            }
        },
        [onEject, currentId]
    );

    const handleInfo = useCallback(async ([item]: readonly PlaylistItem[]) => {
        if (item) {
            await showMediaInfoDialog(item);
        }
    }, []);

    const handleContextMenu = useCallback(
        async (
            selectedItems: readonly PlaylistItem[],
            x: number,
            y: number,
            rowIndex: number,
            button: number
        ) => {
            if (items.length === 0) {
                return;
            }
            const action = await showActionsMenu(
                items,
                selectedItems,
                rowIndex,
                x,
                y,
                button === -1 ? 'right' : 'left'
            );
            switch (action) {
                case 'play':
                    onPlay?.(selectedItems[0]);
                    break;

                case 'remove':
                    playlist.remove(selectedItems);
                    break;

                case 'info':
                    await showMediaInfoDialog(selectedItems[0]);
                    break;

                case 'select-all':
                    listViewRef.current!.selectAll();
                    break;

                case 'reverse-selection': {
                    const startIndex = items.findIndex((item) => item === selectedItems[0]);
                    playlist.reverseAt(startIndex, selectedItems.length);
                    break;
                }

                case 'clear':
                    playlist.clear();
                    break;
            }
        },
        [onPlay, items, listViewRef]
    );

    return (
        <div className="playlist">
            <ListView
                {...props}
                title="Playlist"
                className="media-list"
                layout={layout}
                items={items}
                itemKey="id"
                itemClassName={itemClassName}
                selectedIndex={items.length === 0 ? -1 : 0}
                droppable={true}
                droppableTypes={droppableTypes}
                multiple={true}
                reorderable={true}
                onContextMenu={handleContextMenu}
                onDelete={handleDelete}
                onDoubleClick={handleDoubleClick}
                onDrop={playlist.injectAt}
                onEnter={handleEnter}
                onInfo={handleInfo}
                onMove={playlist.moveSelection}
                onSelect={handleSelect}
                listViewRef={listViewRef}
            />
            <MediaListStatusBar items={items} size={items.length} selectedCount={selectedCount} />
        </div>
    );
}
