import React, {useCallback} from 'react';
import {Except} from 'type-fest';
import Action from 'types/Action';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource from 'types/MediaSource';
import {getServiceFromSrc} from 'services/mediaServices';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
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
    const sourceId = `${source.sourceId || source.id}/2`;
    const defaultSort = source.secondaryItems?.sort?.defaultSort;
    const sorting = getSourceSorting(sourceId) || defaultSort;
    const moveable =
        parentPlaylist?.items?.moveable &&
        (!defaultSort ||
            (sorting!.sortBy === defaultSort.sortBy &&
                sorting!.sortOrder === defaultSort.sortOrder));

    const injectAt = useCallback(
        async (items: readonly MediaItem[], atIndex: number) => {
            if (parentPlaylist) {
                const service = getServiceFromSrc(parentPlaylist);
                await service?.addToPlaylist?.(
                    parentPlaylist,
                    items,
                    moveable ? atIndex : undefined
                );
            }
        },
        [parentPlaylist, moveable]
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
            if (moveable) {
                const service = getServiceFromSrc(parentPlaylist);
                if (service?.movePlaylistItems) {
                    service?.movePlaylistItems(parentPlaylist, items, toIndex);
                }
            }
        },
        [parentPlaylist, moveable]
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
            moveable={moveable}
            onDelete={handleDelete}
            onDrop={handleDrop}
            onMove={handleMove}
        />
    );
}
