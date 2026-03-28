import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Except} from 'type-fest';
import Action from 'types/Action';
import LookupStatus from 'types/LookupStatus';
import PlaylistItem from 'types/PlaylistItem';
import RepeatMode from 'types/RepeatMode';
import playbackSettings from 'services/mediaPlayback/playbackSettings';
import playlist from 'services/playlist';
import {performAction} from 'components/Actions';
import Icon from 'components/Icon';
import ListView, {ListViewHandle, ListViewProps} from 'components/ListView';
import MediaListStatusBar from 'components/MediaList/MediaListStatusBar';
import useCurrentlyPlayingId from 'hooks/useCurrentlyPlayingId';
import useObservable from 'hooks/useObservable';
import useOnDragStart from 'components/MediaList/useOnDragStart';
import usePlaybackSettings from 'hooks/usePlaybackSettings';
import usePlaylistInject from 'hooks/usePlaylistInject';
import usePreferences from 'hooks/usePreferences';
import {showMediaInfoDialog} from 'components/MediaInfo/MediaInfoDialog';
import showActionsMenu from './showActionsMenu';
import usePlaylistLayout from './usePlaylistLayout';
import './Playlist.scss';

const droppableTypes = [
    'audio/*',
    'video/*',
    // Preferred order.
    'text/x-spotify-tracks',
    'text/uri-list',
    'text/plain',
];

type NotRequired = 'items' | 'itemKey' | 'title' | 'layout' | 'sortable' | 'droppableTypes';

export interface PlaylistProps extends Except<ListViewProps<PlaylistItem>, NotRequired> {
    onPlay?: (item: PlaylistItem) => void;
    onEject?: () => void;
    ref: React.RefObject<ListViewHandle | null>;
}

export default function Playlist({onSelect, onPlay, onEject, ref, ...props}: PlaylistProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const items = useObservable(playlist.observe, []);
    const size = items.length;
    const layout = usePlaylistLayout(size);
    const currentId = useCurrentlyPlayingId();
    const {repeatMode} = usePlaybackSettings();
    const [selectedItems, setSelectedItems] = useState<readonly PlaylistItem[]>([]);
    const onDragStart = useOnDragStart(selectedItems);
    const inject = usePlaylistInject(playlist.injectAt);
    const [startIndex, setStartIndex] = useState(-1);
    const noStartIndex = startIndex === -1;
    const {disableExplicitContent} = usePreferences();

    useEffect(() => {
        if (noStartIndex && currentId) {
            const rowIndex = items.findIndex((item) => item.id === currentId);
            setStartIndex(rowIndex);
        }
    }, [noStartIndex, items, currentId]);

    const itemClassName = useCallback(
        (item: PlaylistItem) => {
            const [serviceId] = item.src.split(':');
            const playing = item.id === currentId;
            const unplayable =
                item.unplayable ||
                (disableExplicitContent && item.explicit) ||
                item.lookupStatus === LookupStatus.NotFound;
            return `service-${serviceId} ${playing ? 'playing' : ''} ${
                unplayable ? 'unplayable' : ''
            }`;
        },
        [currentId, disableExplicitContent]
    );

    const handleSelect = useCallback(
        (items: readonly PlaylistItem[]) => {
            setSelectedItems(items);
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
            await showMediaInfoDialog(item, {scrobblingOptions: true});
        }
    }, []);

    const handleContextMenu = useCallback(
        async (
            selectedItems: readonly PlaylistItem[],
            x: number,
            y: number,
            button: number,
            rowIndex: number
        ) => {
            if (items.length === 0) {
                return;
            }
            const action = await showActionsMenu(
                items,
                selectedItems,
                rowIndex,
                containerRef.current!,
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
                    await showMediaInfoDialog(selectedItems[0], {scrobblingOptions: true});
                    break;

                case 'select-all':
                    ref.current!.selectAll();
                    break;

                case 'reverse-selection': {
                    const startIndex = items.findIndex((item) => item === selectedItems[0]);
                    playlist.reverseAt(startIndex, selectedItems.length);
                    break;
                }

                case 'toggle-repeat': {
                    playbackSettings.repeatMode =
                        playbackSettings.repeatMode === RepeatMode.One
                            ? RepeatMode.None
                            : RepeatMode.One;
                    break;
                }

                default:
                    performAction(action as Action, selectedItems);
                    break;
            }
        },
        [onPlay, items, ref]
    );

    return (
        <div className="playlist" onDragStart={onDragStart} ref={containerRef}>
            <ListView
                {...props}
                title="Playlist"
                className="media-list"
                layout={layout}
                items={items}
                itemKey="id"
                itemClassName={itemClassName}
                selectedIndex={startIndex}
                draggable={true}
                droppable={true}
                droppableTypes={droppableTypes}
                moveable={true}
                multiple={true}
                onContextMenu={handleContextMenu}
                onDelete={handleDelete}
                onDoubleClick={handleDoubleClick}
                onDrop={inject.onDrop}
                onEnter={handleEnter}
                onInfo={handleInfo}
                onMove={playlist.moveSelection}
                onSelect={handleSelect}
                ref={ref}
            />
            <MediaListStatusBar
                items={items}
                size={items.length}
                selectedCount={selectedItems.length}
                icons={
                    repeatMode
                        ? [
                              <span
                                  title={
                                      repeatMode === RepeatMode.One
                                          ? 'The current track is on repeat'
                                          : 'The playlist is on repeat'
                                  }
                                  key="repeat"
                              >
                                  <Icon name="loop" />
                              </span>,
                          ]
                        : undefined
                }
            />
        </div>
    );
}
