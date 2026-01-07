import React, {useCallback} from 'react';
import {Except} from 'type-fest';
import Action from 'types/Action';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource from 'types/MediaSource';
import {getServiceFromSrc} from 'services/mediaServices';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import {performAction} from 'components/Actions';
import Icon from 'components/Icon';
import usePager from 'hooks/usePager';
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
    const pager = parentPlaylist?.pager || null;
    const [{complete}] = usePager(pager);
    const deletable = complete && parentPlaylist?.items?.deletable;
    const droppable = complete && parentPlaylist?.items?.droppable;
    const moveable =
        complete &&
        parentPlaylist?.items?.moveable &&
        (!defaultSort ||
            (sorting!.sortBy === defaultSort.sortBy &&
                sorting!.sortOrder === defaultSort.sortOrder));

    const injectAt = useCallback(
        async (items: readonly MediaItem[], atIndex: number) => {
            if (pager?.addItems) {
                pager.addItems(items, moveable ? atIndex : undefined);
            } else if (parentPlaylist) {
                const service = getServiceFromSrc(parentPlaylist);
                await service?.addToPlaylist?.(
                    parentPlaylist,
                    items,
                    moveable ? atIndex : undefined
                );
            }
        },
        [parentPlaylist, pager, moveable]
    );

    const inject = usePlaylistInject(injectAt);

    const handleDelete = useCallback(
        (items: readonly MediaItem[]) => {
            performAction(Action.DeletePlaylistItems, items, parentPlaylist);
        },
        [parentPlaylist]
    );

    const handleDrop = useCallback(
        (items: readonly MediaItem[] | DataTransferItem | readonly File[], atIndex: number) => {
            inject.onDrop(items, atIndex);
        },
        [inject]
    );

    const handleMove = useCallback(
        (items: readonly MediaItem[], toIndex: number) => {
            if (pager?.moveItems) {
                pager.moveItems(items, toIndex);
            } else if (parentPlaylist) {
                const service = getServiceFromSrc(parentPlaylist);
                if (service?.movePlaylistItems) {
                    service.movePlaylistItems(parentPlaylist, items, toIndex);
                }
            }
        },
        [parentPlaylist, pager]
    );

    return (
        <MediaItemList
            {...props}
            className="playlist-items"
            emptyMessage="Empty playlist"
            source={source}
            pager={pager}
            parentPlaylist={parentPlaylist}
            droppable={droppable}
            droppableTypes={droppable ? parentPlaylist?.items?.droppableTypes : undefined}
            moveable={moveable}
            statusBarIcons={
                droppable && complete
                    ? undefined
                    : [
                          <span
                              title={
                                  droppable ? 'Not fully loaded' : 'This playlist cannot be edited'
                              }
                              key="locked"
                          >
                              <Icon name="locked" />
                          </span>,
                      ]
            }
            onDelete={deletable ? handleDelete : undefined}
            onDrop={droppable ? handleDrop : undefined}
            onMove={moveable ? handleMove : undefined}
        />
    );
}
