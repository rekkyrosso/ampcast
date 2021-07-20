import React, {useCallback, useRef, useState} from 'react';
import {Except} from 'type-fest';
import PlaylistItem from 'types/PlaylistItem';
import playlist from 'services/playlist';
import ListView, {ListViewHandle, ListViewProps} from 'components/ListView';
import MediaListStatusBar from 'components/MediaList/MediaListStatusBar';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useObservable from 'hooks/useObservable';
import {showMediaInfoDialog} from 'components/Media/MediaInfoDialog';
import showActionsMenu from './showActionsMenu';
import usePlaylistLayout from './usePlaylistLayout';
import './Playlist.scss';

export const droppableTypes = ['audio/*', 'video/*'];

type NotRequired = 'items' | 'itemKey' | 'layout' | 'sortable' | 'droppableTypes';

export interface PlaylistProps extends Except<ListViewProps<PlaylistItem>, NotRequired> {
    onPlay?: (item: PlaylistItem) => void;
}

export default function Playlist({onSelect, onPlay, ...props}: PlaylistProps) {
    const listViewRef = useRef<ListViewHandle>(null);
    const items = useObservable(playlist.observe, []);
    const size = items.length;
    const layout = usePlaylistLayout(size);
    const currentlyPlaying = useCurrentlyPlaying();
    const [selectedCount, setSelectedCount] = useState(0);

    const itemClassName = useCallback(
        (item: PlaylistItem) => {
            const [source] = item.src.split(':');
            const playing = item.id === currentlyPlaying?.id ? 'playing' : '';
            const unplayable = item.unplayable ? 'unplayable' : '';
            return `source-${source} ${playing} ${unplayable}`;
        },
        [currentlyPlaying]
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

    const handleContextMenu = useCallback(
        async (items: readonly PlaylistItem[], x: number, y: number) => {
            const action = await showActionsMenu(items, x, y);
            switch (action) {
                case 'play':
                    onPlay?.(items[0]);
                    break;

                case 'remove':
                    playlist.remove(items);
                    break;

                case 'info':
                    showMediaInfoDialog(items[0]);
                    break;

                case 'select-all':
                    listViewRef.current!.selectAll();
                    break;
            }
        },
        [onPlay]
    );

    return (
        <div className="playlist">
            <ListView
                {...props}
                className="media-list playable"
                layout={layout}
                items={items}
                itemKey="id"
                itemClassName={itemClassName}
                droppable={true}
                droppableTypes={droppableTypes}
                multiSelect={true}
                reorderable={true}
                onContextMenu={handleContextMenu}
                onDelete={playlist.remove}
                onDoubleClick={handleDoubleClick}
                onDrop={playlist.insertAt}
                onEnter={handleEnter}
                onMove={playlist.moveSelection}
                onSelect={handleSelect}
                listViewRef={listViewRef}
            />
            <MediaListStatusBar items={items} size={items.length} selectedCount={selectedCount} />
        </div>
    );
}
