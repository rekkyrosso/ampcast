import React, {useCallback, useEffect, useState} from 'react';
import {Except} from 'type-fest';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager from 'types/Pager';
import ListView, {ListViewProps} from 'components/ListView';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
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
    onError?: (error: any) => void;
    onLoad?: () => void;
    onNoContent?: () => void;
}

export default function MediaList<T extends MediaObject>({
    className = '',
    pager = null,
    statusBar = true,
    loadingText,
    onContextMenu,
    onDoubleClick,
    onEnter,
    onError,
    onLoad,
    onNoContent,
    onSelect,
    ...props
}: MediaListProps<T>) {
    const layout = useMediaListLayout(props.layout);
    const [scrollIndex, setScrollIndex] = useState(0);
    const [pageSize, setPageSize] = useState(0);
    const [{items, loaded, busy, error, size, maxSize}, fetchAt] = usePager(pager);
    const [selectedItems, setSelectedItems] = useState<readonly T[]>([]);
    const item = useCurrentlyPlaying();
    const currentSrc = item?.src;
    const viewClassName = useViewClassName(layout);
    const hasItems = loaded ? items.length > 0 : undefined;
    const onDragStart = useOnDragStart(selectedItems);
    const {disableExplicitContent} = usePreferences();

    useEffect(() => {
        if (error && onError) {
            onError(error);
        }
    }, [error, onError]);

    useEffect(() => {
        if (loaded && onLoad) {
            onLoad();
        }
    }, [loaded, onLoad]);

    useEffect(() => {
        if (hasItems === false && onNoContent) {
            onNoContent();
        }
    }, [hasItems, onNoContent]);

    useEffect(() => {
        if (scrollIndex >= 0 && pageSize > 0) {
            fetchAt(scrollIndex, pageSize);
        }
    }, [fetchAt, scrollIndex, pageSize, pager]);

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
        [onDoubleClick]
    );

    const handleEnter = useCallback(
        async (items: readonly T[], ctrlKey: boolean, shiftKey: boolean) => {
            if (items.every(isPlayable)) {
                if (!ctrlKey && !shiftKey) {
                    await performAction(Action.Queue, items);
                } else if (ctrlKey && !shiftKey) {
                    await performAction(Action.PlayNow, items);
                } else if (shiftKey && !ctrlKey) {
                    await performAction(Action.PlayNext, items);
                }
            } else {
                onEnter?.(items, ctrlKey, shiftKey);
            }
        },
        [onEnter]
    );

    const handleInfo = useCallback(async (items: readonly T[]) => {
        await performAction(Action.Info, items);
    }, []);

    const itemClassName = useCallback(
        (item: T) => {
            if (item?.itemType === ItemType.Media) {
                const [source] = item.src.split(':');
                const playing = item.src === currentSrc ? 'playing' : '';
                const unplayable =
                    item.unplayable || (disableExplicitContent && item.explicit)
                        ? 'unplayable'
                        : '';
                return `source-${source} ${playing} ${unplayable}`;
            } else {
                return '';
            }
        },
        [currentSrc, disableExplicitContent]
    );

    return (
        <div className={`panel ${className} ${viewClassName}`} onDragStart={onDragStart}>
            <ListView
                {...props}
                className="media-list"
                layout={layout}
                items={items}
                itemClassName={itemClassName}
                itemKey={'src' as any} // TODO: remove cast
                selectedIndex={items.length === 0 ? -1 : 0}
                onContextMenu={onContextMenu || handleContextMenu}
                onDoubleClick={handleDoubleClick}
                onEnter={handleEnter}
                onInfo={handleInfo}
                onPageSizeChange={setPageSize}
                onScrollIndexChange={setScrollIndex}
                onSelect={handleSelect}
            />
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

function isPlayable(item: MediaObject): boolean {
    return item.itemType === ItemType.Media || item.itemType === ItemType.Album;
}
