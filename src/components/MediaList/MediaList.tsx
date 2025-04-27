import React, {ComponentType, useCallback, useEffect, useState} from 'react';
import {Except} from 'type-fest';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager from 'types/Pager';
import ErrorBox, {ErrorBoxProps} from 'components/Errors/ErrorBox';
import ListView, {ListViewProps} from 'components/ListView';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useFirstValue from 'hooks/useFirstValue';
import usePager from 'hooks/usePager';
import usePreferences from 'hooks/usePreferences';
import {performAction} from 'components/Actions';
import MediaListStatusBar from './MediaListStatusBar';
import useMediaListLayout from './useMediaListLayout';
import useOnDragStart from './useOnDragStart';
import useViewClassName from './useViewClassName';
import showActionsMenu from './showActionsMenu';
import './MediaList.scss';

export interface MediaListProps<T extends MediaObject>
    extends Except<ListViewProps<T>, 'items' | 'itemKey' | 'itemClassName' | 'layout'> {
    pager: Pager<T> | null;
    layout?: MediaSourceLayout<T>;
    statusBar?: boolean;
    loadingText?: string;
    emptyMessage?: React.ReactNode;
    reportingId?: string;
    onError?: (error: unknown) => void;
    onLoad?: () => void;
    Error?: ComponentType<ErrorBoxProps>;
}

export default function MediaList<T extends MediaObject>({
    className = '',
    draggable = false,
    pager = null,
    statusBar = true,
    loadingText,
    emptyMessage,
    reportingId,
    onContextMenu,
    onDoubleClick,
    onEnter,
    onError,
    onLoad,
    onSelect,
    Error = ErrorBox,
    ...props
}: MediaListProps<T>) {
    const layout = useMediaListLayout(props.layout);
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
        async (items: readonly T[], x: number, y: number, rowIndex: number, button: number) => {
            if (items.length === 0) {
                return;
            }
            const action = await showActionsMenu(
                items,
                true,
                x,
                y,
                button === -1 ? 'right' : 'left'
            );
            if (action) {
                await performAction(action, items);
            }
        },
        []
    );

    const handleDoubleClick = useCallback(
        async (item: T, rowIndex: number) => {
            if (isPlayable(item)) {
                await performAction(Action.Queue, [item]);
            } else {
                onDoubleClick?.(item, rowIndex);
            }
        },
        [onDoubleClick, isPlayable]
    );

    const handleEnter = useCallback(
        async (items: readonly T[], cmdKey: boolean, shiftKey: boolean) => {
            if (items.every(isPlayable)) {
                if (!cmdKey && !shiftKey) {
                    await performAction(Action.Queue, items);
                } else if (cmdKey && !shiftKey) {
                    await performAction(Action.PlayNow, items);
                } else if (shiftKey && !cmdKey) {
                    await performAction(Action.PlayNext, items);
                }
            } else {
                onEnter?.(items, cmdKey, shiftKey);
            }
        },
        [onEnter, isPlayable]
    );

    const handleInfo = useCallback(async (items: readonly T[]) => {
        await performAction(Action.Info, items);
    }, []);

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
        <div className={`panel ${className} ${viewClassName}`} onDragStart={onDragStart}>
            {empty && error ? (
                <Error error={error} reportedBy="MediaList" reportingId={reportingId} />
            ) : loaded && empty && emptyMessage ? (
                <Empty message={emptyMessage} />
            ) : (
                <ListView
                    {...props}
                    className="media-list"
                    layout={layout}
                    items={items}
                    itemClassName={itemClassName}
                    itemKey={'src' as any} // TODO: remove cast
                    draggable={draggable}
                    selectedIndex={items.length === 0 ? -1 : 0}
                    onContextMenu={onContextMenu || handleContextMenu}
                    onDoubleClick={handleDoubleClick}
                    onEnter={handleEnter}
                    onInfo={handleInfo}
                    onPageSizeChange={setPageSize}
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
