import React, {useCallback, useEffect, useState} from 'react';
import {Except} from 'type-fest';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource from 'types/MediaSource';
import {exists} from 'utils';
import listenbrainzApi from 'services/listenbrainz/listenbrainzApi';
import {getServiceFromSrc} from 'services/mediaServices';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import {dispatchPlaylistItemsChange} from 'services/metadata';
import {performAction} from 'components/Actions';
import {getPlaylistItemsByService} from 'components/Actions/recentPlaylists';
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
    const [cursor, setCursor] = useState<string | undefined>(undefined);
    const sourceId = `${source.sourceId || source.id}/2`;
    const defaultSort = source.secondaryItems?.sort?.defaultSort;
    const sorting = getSourceSorting(sourceId) || defaultSort;
    const config = parentPlaylist?.items;
    const pager = parentPlaylist?.pager || null;
    const [{busy, complete, error}] = usePager(pager);
    const unlocked = complete && !error && !busy && config?.droppable;
    const deletable = unlocked && config?.deletable;
    const droppable = unlocked;
    const droppableTypes = droppable ? config?.droppableTypes : undefined;
    const moveable =
        unlocked &&
        config?.moveable &&
        (!defaultSort ||
            (sorting!.sortBy === defaultSort.sortBy &&
                sorting!.sortOrder === defaultSort.sortOrder));

    useEffect(() => {
        setCursor(busy && complete ? 'progress' : undefined);
    }, [busy, complete]);

    const injectAt = useCallback(
        async (items: readonly MediaItem[], atIndex: number) => {
            if (parentPlaylist) {
                const service = getServiceFromSrc(parentPlaylist);
                if (service?.id === 'listenbrainz') {
                    setCursor('wait');
                    items = await listenbrainzApi.addMetadata(items);
                    setCursor(undefined);
                }
                const itemsByService = getPlaylistItemsByService(items);
                const additions = itemsByService.find(
                    (option) => option.service === service
                )?.items;
                if (additions?.length) {
                    if (pager?.addItems) {
                        pager.addItems(additions, moveable ? atIndex : undefined);
                    } else if (service?.addToPlaylist) {
                        await service.addToPlaylist(
                            parentPlaylist,
                            additions,
                            moveable ? atIndex : undefined
                        );
                        dispatchPlaylistItemsChange('added', parentPlaylist.src, additions);
                    }
                }
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

    const canDropItem = useCallback(
        (item: MediaObject): boolean => {
            if (parentPlaylist && item.itemType === ItemType.Media) {
                const [serviceId] = parentPlaylist.src.split(':');
                return (
                    serviceId === 'localdb' ||
                    serviceId === 'listenbrainz' ||
                    item.src.startsWith(`${serviceId}:`)
                );
            }
            return false;
        },
        [parentPlaylist]
    );

    return (
        <MediaItemList
            {...props}
            className="playlist-items"
            emptyMessage="Empty playlist"
            source={source}
            pager={pager}
            parentPlaylist={parentPlaylist}
            canDropItem={canDropItem}
            droppable={droppable}
            droppableTypes={droppableTypes}
            moveable={moveable}
            cursor={cursor}
            statusBarIcons={
                parentPlaylist
                    ? unlocked
                        ? [
                              moveable ? 'mov' : undefined,
                              deletable ? 'del' : undefined,
                              droppable ? 'add' : undefined,
                          ]
                              .filter(exists)
                              .map((permission) => (
                                  <span className="permission" key={permission}>
                                      {permission}
                                  </span>
                              ))
                        : [
                              <span
                                  title={
                                      droppable
                                          ? complete
                                              ? 'Synching'
                                              : 'Not fully loaded'
                                          : 'This playlist cannot be edited'
                                  }
                                  key="locked"
                              >
                                  <Icon name="locked" />
                              </span>,
                          ]
                    : undefined
            }
            onDelete={deletable ? handleDelete : undefined}
            onDrop={droppable ? handleDrop : undefined}
            onMove={moveable ? handleMove : undefined}
        />
    );
}
