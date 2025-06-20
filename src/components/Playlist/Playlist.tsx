import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Except} from 'type-fest';
import Action from 'types/Action';
import LookupStatus from 'types/LookupStatus';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import PlaylistItem from 'types/PlaylistItem';
import playlist from 'services/playlist';
import {performAction} from 'components/Actions';
import {error} from 'components/Dialog';
import ListView, {ListViewHandle, ListViewProps} from 'components/ListView';
import MediaListStatusBar from 'components/MediaList/MediaListStatusBar';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useObservable from 'hooks/useObservable';
import useOnDragStart from 'components/MediaList/useOnDragStart';
import usePreferences from 'hooks/usePreferences';
import {showMediaInfoDialog} from 'components/MediaInfo/MediaInfoDialog';
import showActionsMenu from './showActionsMenu';
import usePlaylistInject from './usePlaylistInject';
import usePlaylistLayout from './usePlaylistLayout';
import './Playlist.scss';

export const droppableTypes = [
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
    const item = useCurrentlyPlaying();
    const currentId = item?.id;
    const [selectedItems, setSelectedItems] = useState<readonly PlaylistItem[]>([]);
    const onDragStart = useOnDragStart(selectedItems);
    const inject = usePlaylistInject();
    const [startIndex, setStartIndex] = useState(-1);
    const noStartIndex = startIndex === -1;
    const {disableExplicitContent} = usePreferences();

    useEffect(() => {
        if (noStartIndex && item) {
            const selectedId = item.id;
            const rowIndex = items.findIndex((item) => item.id === selectedId);
            setStartIndex(rowIndex);
        }
    }, [noStartIndex, item, items]);

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
            await showMediaInfoDialog(item);
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
                    await showMediaInfoDialog(selectedItems[0]);
                    break;

                case 'select-all':
                    ref.current!.selectAll();
                    break;

                case 'reverse-selection': {
                    const startIndex = items.findIndex((item) => item === selectedItems[0]);
                    playlist.reverseAt(startIndex, selectedItems.length);
                    break;
                }

                default:
                    await performAction(action as Action, selectedItems);
                    break;
            }
        },
        [onPlay, items, ref]
    );

    const handleDrop = useCallback(
        async (
            data: readonly MediaItem[] | readonly MediaAlbum[] | readonly File[] | DataTransferItem,
            atIndex: number
        ) => {
            if (data instanceof DataTransferItem) {
                const type = data.type;
                switch (type) {
                    case 'text/x-spotify-tracks': {
                        data.getAsString(async (string) => {
                            await inject.spotifyTracks(type, string, atIndex);
                        });
                        break;
                    }

                    case 'text/uri-list':
                        data.getAsString(async (string) => {
                            const urls = string.trim().split(/\s+/);
                            const [url] = urls;
                            if (url) {
                                const hostname = new URL(url).hostname;
                                if (hostname === 'music.apple.com') {
                                    await inject.appleTracks(type, string, atIndex);
                                } else if (hostname === 'open.spotify.com') {
                                    await inject.spotifyTracks(type, string, atIndex);
                                } else {
                                    await inject.urls(urls, atIndex);
                                }
                            }
                        });
                        break;

                    case 'text/plain':
                        data.getAsString(async (string) => {
                            try {
                                const {
                                    items: [item],
                                } = JSON.parse(string);
                                if (/^(song|album|playlist)$/.test(item.kind)) {
                                    await inject.appleTracks(type, string, atIndex);
                                    return;
                                }
                            } catch {
                                // Handled below.
                            }
                            error('No music data found.');
                        });
                        break;
                }
            } else if (data[0] instanceof File) {
                await inject.files(data as readonly File[], atIndex);
            } else {
                await inject.items(data as readonly MediaItem[], atIndex);
            }
        },
        [inject]
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
                onDrop={handleDrop}
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
            />
        </div>
    );
}
