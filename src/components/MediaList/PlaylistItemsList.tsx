import React, {useCallback} from 'react';
import {Except} from 'type-fest';
import Action from 'types/Action';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource from 'types/MediaSource';
import {getServiceFromSrc} from 'services/mediaServices';
import {performAction} from 'components/Actions';
import usePlaylistInject from 'hooks/usePlaylistInject';
import MediaItemList from './MediaItemList';
import {MediaListProps} from './MediaList';

type PlaylistItemsListProps = Except<MediaListProps<MediaItem>, 'pager' | 'source'> & {
    source: MediaSource<MediaPlaylist>;
};

export default function PlaylistItemsList({
    parentPlaylist,
    source,
    ...props
}: PlaylistItemsListProps) {
    const injectAt = useCallback(
        async (items: readonly MediaItem[], atIndex: number) => {
            if (parentPlaylist) {
                const service = getServiceFromSrc(parentPlaylist);
                await service?.addToPlaylist?.(parentPlaylist, items, atIndex);
            }
        },
        [parentPlaylist]
    );

    const inject = usePlaylistInject(injectAt);

    const handleDelete = useCallback(
        (items: readonly MediaItem[]) => {
            if (parentPlaylist?.items?.deletable) {
                performAction(Action.DeletePlaylistItems, items, parentPlaylist);
            }
        },
        [parentPlaylist]
    );

    const handleDrop = useCallback(
        (items: readonly MediaItem[] | DataTransferItem | readonly File[], atIndex: number) => {
            if (parentPlaylist?.items?.droppable) {
                inject.onDrop(items, atIndex);
            }
        },
        [parentPlaylist, inject]
    );

    const handleMove = useCallback(
        (items: readonly MediaItem[], toIndex: number) => {
            if (parentPlaylist?.items?.moveable) {
                const service = getServiceFromSrc(parentPlaylist);
                if (service?.movePlaylistItems) {
                    service?.movePlaylistItems(parentPlaylist, items, toIndex, source);
                }
            }
        },
        [parentPlaylist, source]
    );
    return (
        <MediaItemList
            {...props}
            className="playlist-items"
            emptyMessage="Empty playlist"
            source={source}
            pager={parentPlaylist?.pager || null}
            parentPlaylist={parentPlaylist}
            droppable={parentPlaylist?.items?.droppable}
            droppableTypes={parentPlaylist?.items?.droppableTypes}
            moveable={parentPlaylist?.items?.moveable}
            onDelete={handleDelete}
            onDrop={handleDrop}
            onMove={handleMove}
        />
    );
}
