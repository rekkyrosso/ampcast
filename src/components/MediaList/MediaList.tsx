import React, {useCallback, useEffect, useId, useReducer, useRef, useState} from 'react';
import {interval} from 'rxjs';
import {Except, SetOptional} from 'type-fest';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaListLayout, {Field} from 'types/MediaListLayout';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import {setSourceFields} from 'services/mediaServices/servicesSettings';
import {ActionsProps, performAction, showActionsMenu} from 'components/Actions';
import ErrorBox, {ErrorBoxProps} from 'components/Errors/ErrorBox';
import ListView, {Column, ListViewProps} from 'components/ListView';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useFirstValue from 'hooks/useFirstValue';
import usePager from 'hooks/usePager';
import usePreferences from 'hooks/usePreferences';
import MediaListStatusBar from './MediaListStatusBar';
import useMediaListLayout from './useMediaListLayout';
import useOnDragStart from './useOnDragStart';
import useViewClassName from './useViewClassName';
import './MediaList.scss';

const defaultMediaListLayout: MediaListLayout = {
    view: 'card minimal',
    card: {h1: 'Title'},
    details: ['Title'],
};

export interface MediaListProps<T extends MediaObject>
    extends Except<
        SetOptional<ListViewProps<T>, 'itemKey'>,
        'items' | 'itemClassName' | 'layout' | 'storageId'
    > {
    source?: MediaSource<any>;
    level?: 1 | 2 | 3;
    pager: Pager<T> | null;
    parentPlaylist?: T extends MediaItem ? MediaPlaylist : never;
    defaultLayout?: MediaListLayout;
    layoutOptions?: Partial<MediaListLayout>;
    statusBar?: boolean;
    loadingText?: string;
    emptyMessage?: React.ReactNode;
    onError?: (error: unknown) => void;
    onLoad?: () => void;
    Actions?: React.FC<ActionsProps>;
    Error?: React.FC<ErrorBoxProps>;
}

export default function MediaList<T extends MediaObject>({
    source,
    level = 1,
    className = '',
    itemKey = 'src' as never, // TODO: Huh?
    defaultLayout = defaultMediaListLayout,
    layoutOptions,
    draggable = false,
    reorderable = true,
    pager = null,
    parentPlaylist,
    statusBar = true,
    loadingText,
    emptyMessage,
    onContextMenu,
    onDoubleClick,
    onEnter,
    onError,
    onLoad,
    onSelect,
    Actions,
    Error = ErrorBox,
    ...props
}: MediaListProps<T>) {
    const uniqueId = useId();
    const [, forceUpdate] = useReducer((i) => i + 1, 0);
    const id = source ? `${source.sourceId || source.id}/${level}` : uniqueId;
    const containerRef = useRef<HTMLDivElement | null>(null);
    const layout = useMediaListLayout(id, defaultLayout, layoutOptions, Actions, parentPlaylist);
    const [scrollIndex, setScrollIndex] = useState(0);
    const [pageSize, setPageSize] = useState(0);
    const [{items, loaded, busy, error, size, maxSize}, fetchAt] = usePager(pager);
    const empty = items.length === 0;
    const initialError = useFirstValue(empty ? error : null);
    const success = loaded && !initialError;
    const [selectedItems, setSelectedItems] = useState<readonly T[]>([]);
    const currentItem = useCurrentlyPlaying();
    const currentSrc = currentItem?.src;
    const viewClassName = useViewClassName(layout);
    const {disableExplicitContent} = usePreferences();
    const onDragStart = useOnDragStart(selectedItems);

    useEffect(() => {
        // Make sure `LastPlayed` fields etc are updated.
        const subscription = interval(60_000).subscribe(forceUpdate);
        return () => subscription.unsubscribe();
    }, []);

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
        if (scrollIndex >= 0 && pageSize > 0) {
            fetchAt(scrollIndex, pageSize);
        }
    }, [fetchAt, scrollIndex, pageSize, pager]);

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
            const action = await showActionsMenu(
                items,
                containerRef.current!,
                x,
                y,
                button === -1 ? 'right' : 'left',
                {inListView: true, parentPlaylist}
            );
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
                performAction(Action.Queue, [item]);
            } else {
                onDoubleClick?.(item, rowIndex);
            }
        },
        [onDoubleClick, isPlayable]
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

    const handleReorder = useCallback(
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
                setSourceFields(id, newFields.filter((field) => field !== 'Actions') as Field[]);
            }
        },
        [id, layout]
    );

    const itemClassName = useCallback(
        (item: T) => {
            if (item?.itemType === ItemType.Media) {
                const [serviceId, type, id] = item.src.split(':');
                const playing =
                    item.src === currentSrc || (type === 'listen' && id === 'now-playing')
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
        [currentSrc, disableExplicitContent]
    );

    return (
        <div
            className={`panel ${className} ${viewClassName}`}
            id={id}
            data-view={layout.view}
            onDragStart={onDragStart}
            ref={containerRef}
        >
            {empty && error ? (
                <Error error={error} reportedBy="MediaList" reportingId={id} />
            ) : loaded && empty && emptyMessage ? (
                <Empty message={emptyMessage} />
            ) : (
                <ListView
                    {...props}
                    className="media-list"
                    layout={layout}
                    items={items}
                    itemClassName={itemClassName}
                    itemKey={itemKey}
                    draggable={draggable}
                    reorderable={reorderable}
                    storageId={id}
                    onContextMenu={onContextMenu || handleContextMenu}
                    onDoubleClick={handleDoubleClick}
                    onEnter={handleEnter}
                    onInfo={handleInfo}
                    onPageSizeChange={setPageSize}
                    onReorder={handleReorder}
                    onScrollIndexChange={setScrollIndex}
                    onSelect={handleSelect}
                />
            )}
            {statusBar ? (
                <MediaListStatusBar
                    items={items}
                    error={error}
                    size={size}
                    maxSize={maxSize}
                    loading={!!pager && !loaded}
                    loadingText={loadingText}
                    busy={busy}
                    selectedCount={selectedItems.length}
                />
            ) : null}
        </div>
    );
}

function Empty<T extends MediaObject>({message}: {message: MediaListProps<T>['emptyMessage']}) {
    return (
        <div className="error-box empty">
            <div className="note">{typeof message === 'string' ? <p>{message}</p> : message}</div>
        </div>
    );
}
