import React, {useCallback, useEffect, useId, useMemo, useReducer, useRef, useState} from 'react';
import {interval} from 'rxjs';
import {Except} from 'type-fest';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaListLayout, {Field} from 'types/MediaListLayout';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import ParentOf from 'types/ParentOf';
import SortParams from 'types/SortParams';
import {setSourceFields} from 'services/mediaServices/servicesSettings';
import {getMediaListId, getMediaSourceItems} from 'services/mediaServices/mediaSources';
import {performAction, showActionsMenu} from 'components/Actions';
import ErrorBox, {ErrorBoxProps} from 'components/Errors/ErrorBox';
import ListView, {Column, ListViewProps} from 'components/ListView';
import useIsBrowserActive from 'components/MediaBrowser/useIsBrowserActive';
import useFirstValue from 'hooks/useFirstValue';
import usePager from 'hooks/usePager';
import usePlaybackState from 'hooks/usePlaybackState';
import usePreferences from 'hooks/usePreferences';
import MediaListStatusBar from './MediaListStatusBar';
import useMediaListLayout from './useMediaListLayout';
import useActionsStore from './useActionsStore';
import useMediaListSort from './useMediaListSort';
import useOnDragStart from './useOnDragStart';
import useViewClassName from './useViewClassName';
import './MediaList.scss';

const defaultMediaListLayout: MediaListLayout = {
    view: 'card minimal',
    card: {h1: 'Title'},
    details: ['Title'],
};

export interface MediaListProps<T extends MediaObject> extends Except<
    ListViewProps<T>,
    | 'items'
    | 'itemKey'
    | 'itemClassName'
    | 'layout'
    | 'sortable'
    | 'sortParams'
    | 'savedSortParams'
    | 'storageId'
> {
    source?: MediaSource<any>;
    isSearchResult?: boolean;
    level?: 1 | 2 | 3;
    pager: Pager<T> | null;
    parent?: ParentOf<T>;
    defaultLayout?: MediaListLayout;
    statusBar?: boolean;
    statusBarIcons?: readonly React.ReactNode[];
    loadingText?: string;
    emptyMessage?: string;
    onError?: (error: unknown) => void;
    onLoad?: () => void;
    onInternalSort?: (params: SortParams) => void;
    Error?: React.FC<ErrorBoxProps>;
}

export default function MediaList<T extends MediaObject>({
    source,
    isSearchResult = false,
    level = 1,
    className = '',
    defaultLayout = defaultMediaListLayout,
    draggable = false,
    reorderable = true,
    pager = null,
    parent,
    statusBar = true,
    statusBarIcons,
    loadingText,
    emptyMessage,
    disabled,
    onContextMenu,
    onDoubleClick,
    onEnter,
    onError,
    onInternalSort,
    onLoad,
    onSelect,
    Error = ErrorBox,
    ...props
}: MediaListProps<T>) {
    const uniqueId = useId();
    const active = useIsBrowserActive();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const syntheticAlbum = isSyntheticAlbum(parent) ? parent : undefined;
    const singular = level === 1 && source?.singular;
    const listId = source ? getMediaListId(source, level, syntheticAlbum) : uniqueId;
    const [, forceUpdate] = useReducer((i) => i + 1, 0);
    const sourceItems = getMediaSourceItems(source, level, syntheticAlbum); // view config
    const {itemKey = 'src', layout: layoutOptions} = sourceItems;
    const parentPlaylist = isPlaylist(parent) ? parent : undefined;
    const layout = useMediaListLayout(
        source,
        level,
        listId,
        defaultLayout,
        layoutOptions,
        parentPlaylist
    );
    const [scrollIndex, setScrollIndex] = useState(0);
    const [pageSize, setPageSize] = useState(0);
    const [{items, loaded, busy, complete, error, size, maxSize}, fetchAt] = usePager(pager);
    const actionsReady = useActionsStore(level === 1 ? source : undefined, complete);
    const canFetch = active && actionsReady;
    const empty = items.length === 0;
    const initialError = useFirstValue(empty ? error : null);
    const success = loaded && !initialError;
    const [selectedItems, setSelectedItems] = useState<readonly T[]>([]);
    const {currentItem, paused, currentTime} = usePlaybackState();
    const playingItem = !paused || currentTime > 0 ? currentItem : undefined;
    const playingSrc = playingItem?.src;
    const playingCatalogId = playingItem?.apple?.catalogId;
    const viewClassName = useViewClassName(layout);
    const {disableExplicitContent, doubleClickBehavior} = usePreferences();
    const onDragStart = useOnDragStart(selectedItems);
    const sortable = useMemo(
        () =>
            complete
                ? layout.cols.filter((col) => !col.unsortable).map((col) => col.id!)
                : isSearchResult
                  ? []
                  : Object.keys(sourceItems.sort?.sortOptions || {}),
        [complete, sourceItems, layout, isSearchResult]
    );
    const {sortedItems, sortParams, savedSortParams, onSort} = useMediaListSort(
        listId,
        items,
        isSearchResult,
        sourceItems,
        complete,
        onInternalSort
    );

    useEffect(() => {
        // Make sure `LastPlayed` fields etc are updated.
        const subscription = interval(30_000).subscribe(forceUpdate);
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        // Turns autofill on/off.
        if (active) {
            pager?.activate?.();
            return () => pager?.deactivate?.();
        } else {
            pager?.deactivate?.();
        }
    }, [pager, active]);

    useEffect(() => {
        if (success && onLoad) {
            onLoad();
        }
    }, [success, onLoad]);

    useEffect(() => {
        if (initialError && onError) {
            onError(initialError);
        }
    }, [initialError, onError]);

    useEffect(() => {
        if (canFetch && scrollIndex >= 0 && pageSize > 0) {
            fetchAt(scrollIndex, pageSize);
        }
        // Re-fetch if the pager changes.
    }, [fetchAt, canFetch, scrollIndex, pageSize, pager]);

    const isPlayable = useCallback(
        (item: MediaObject): boolean => {
            return (
                item.itemType === ItemType.Media ||
                item.itemType === ItemType.Album ||
                (item.itemType === ItemType.Playlist && draggable)
            );
        },
        [draggable]
    );

    const handleSelect = useCallback(
        (items: readonly T[]) => {
            setSelectedItems(items);
            onSelect?.(items);
        },
        [onSelect]
    );

    const handleContextMenu = useCallback(
        async (items: readonly T[], x: number, y: number, button: number) => {
            if (items.length === 0) {
                return;
            }
            const action = await showActionsMenu({
                items,
                target: containerRef.current!,
                x,
                y,
                align: button === -1 ? 'right' : 'left',
                inListView: true,
                parentPlaylist,
            });
            if (action) {
                if (action === Action.DeletePlaylistItems) {
                    performAction(action, items, parentPlaylist);
                } else {
                    performAction(action, items);
                }
            }
        },
        [parentPlaylist]
    );

    const handleDoubleClick = useCallback(
        (item: T, rowIndex: number) => {
            if (isPlayable(item)) {
                performAction(doubleClickBehavior, [item]);
            } else {
                onDoubleClick?.(item, rowIndex);
            }
        },
        [onDoubleClick, isPlayable, doubleClickBehavior]
    );

    const handleEnter = useCallback(
        (items: readonly T[], cmdKey: boolean, shiftKey: boolean) => {
            if (items.every(isPlayable)) {
                if (!cmdKey && !shiftKey) {
                    performAction(Action.Queue, items);
                } else if (cmdKey && !shiftKey) {
                    performAction(Action.PlayNow, items);
                } else if (shiftKey && !cmdKey) {
                    performAction(Action.PlayNext, items);
                }
            } else {
                onEnter?.(items, cmdKey, shiftKey);
            }
        },
        [onEnter, isPlayable]
    );

    const handleInfo = useCallback((items: readonly T[]) => {
        performAction(Action.Info, items);
    }, []);

    const handleReorderCols = useCallback(
        (col: Column<any>, toIndex: number) => {
            const fields = layout.cols.map((col) => col.id);
            const insertBeforeField = fields[toIndex];
            if (col.id !== insertBeforeField && col.id !== 'Actions') {
                const newFields = fields.filter((field) => field !== col.id);
                const insertAtIndex = newFields.indexOf(insertBeforeField);
                if (insertAtIndex >= 0) {
                    newFields.splice(insertAtIndex, 0, col.id);
                } else {
                    newFields.push(col.id);
                }
                setSourceFields(
                    listId,
                    newFields.filter((field) => field !== 'Actions') as Field[]
                );
            }
        },
        [listId, layout]
    );

    const itemClassName = useCallback(
        (item: T) => {
            if (item?.itemType === ItemType.Media) {
                const [serviceId] = item.src.split(':');
                const playing =
                    !singular &&
                    (item.src === playingSrc ||
                        (playingCatalogId && item.apple?.catalogId === playingCatalogId) ||
                        item.playedAt === -1)
                        ? 'playing'
                        : '';
                const unplayable =
                    item.unplayable || (disableExplicitContent && item.explicit)
                        ? 'unplayable'
                        : '';
                return `service-${serviceId} ${playing} ${unplayable}`;
            } else {
                return '';
            }
        },
        [singular, playingSrc, playingCatalogId, disableExplicitContent]
    );

    return (
        <div
            className={`panel ${className} ${viewClassName} ${level === 3 ? 'tertiary' : level === 2 ? 'secondary' : 'primary'}-items`}
            data-list-id={listId}
            data-view={layout.view}
            data-sort-by={savedSortParams?.sortBy}
            data-sort-order={savedSortParams?.sortOrder}
            onDragStart={onDragStart}
            ref={containerRef}
        >
            {empty && error ? (
                <Error error={error} reportedBy="MediaList" reportingId={listId} />
            ) : (
                <ListView
                    {...props}
                    className="media-list"
                    layout={layout}
                    items={sortedItems}
                    itemClassName={itemClassName}
                    itemKey={itemKey as any}
                    emptyMessage={
                        loaded && empty ? emptyMessage || sourceItems?.emptyMessage : undefined
                    }
                    disabled={singular ? true : disabled}
                    hidden={!active}
                    draggable={singular ? false : draggable}
                    reorderable={reorderable}
                    sortable={sortable}
                    sortParams={sortParams}
                    savedSortParams={savedSortParams}
                    storageId={listId}
                    onContextMenu={onContextMenu || handleContextMenu}
                    onDoubleClick={handleDoubleClick}
                    onEnter={handleEnter}
                    onInfo={handleInfo}
                    onPageSizeChange={setPageSize}
                    onReorderCols={handleReorderCols}
                    onScrollIndexChange={setScrollIndex}
                    onSort={onSort}
                    onSelect={handleSelect}
                />
            )}
            {active && statusBar && !singular ? (
                <MediaListStatusBar
                    items={items}
                    error={error}
                    size={size}
                    maxSize={maxSize}
                    loading={!!pager && (!loaded || !actionsReady)}
                    loadingText={actionsReady ? loadingText : 'Synching'}
                    busy={busy || !actionsReady}
                    selectedCount={selectedItems.length}
                    icons={statusBarIcons}
                />
            ) : null}
        </div>
    );
}

function isPlaylist(item?: MediaObject): item is MediaPlaylist {
    return item?.itemType === ItemType.Playlist;
}

function isSyntheticAlbum(item?: MediaObject): item is MediaAlbum {
    return !!item?.synthetic && item.itemType === ItemType.Album;
}
