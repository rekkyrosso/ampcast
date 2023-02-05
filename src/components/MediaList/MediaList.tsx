import React, {useCallback, useEffect, useState} from 'react';
import {Except} from 'type-fest';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager from 'types/Pager';
import {performAction} from 'services/actions';
import ListView, {ListViewProps} from 'components/ListView';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import usePager from 'hooks/usePager';
import MediaListStatusBar from './MediaListStatusBar';
import useMediaListLayout from './useMediaListLayout';
import showActionsMenu from './showActionsMenu';
import './MediaList.scss';

export interface MediaListProps<T extends MediaObject>
    extends Except<ListViewProps<T>, 'items' | 'itemKey' | 'layout'> {
    pager?: Pager<T> | null;
    keepAlive?: boolean;
    layout?: MediaSourceLayout<T>;
    statusBar?: boolean;
    loadingText?: string;
}

export default function MediaList<T extends MediaObject>({
    className = '',
    pager = null,
    keepAlive,
    statusBar = true,
    loadingText,
    onDoubleClick,
    onEnter,
    onSelect,
    ...props
}: MediaListProps<T>) {
    const layout = useMediaListLayout(props.layout);
    const [scrollIndex, setScrollIndex] = useState(0);
    const [pageSize, setPageSize] = useState(0);
    const [{items, loaded, error, size, maxSize}, fetchAt] = usePager(pager, keepAlive);
    const [selectedCount, setSelectedCount] = useState(0);
    const currentlyPlaying = useCurrentlyPlaying();
    const propsItemClassName = props.itemClassName;

    useEffect(() => {
        if (scrollIndex >= 0 && pageSize > 0) {
            fetchAt(scrollIndex, pageSize);
        }
    }, [fetchAt, scrollIndex, pageSize, pager]);

    const handleSelect = useCallback(
        (items: readonly T[]) => {
            setSelectedCount(items.length);
            onSelect?.(items);
        },
        [onSelect]
    );

    const handleContextMenu = useCallback(async (items: readonly T[], x: number, y: number) => {
        if (items.length === 0) {
            return;
        }
        const action = await showActionsMenu(items, x, y);
        if (action) {
            await performAction(action, items);
        }
    }, []);

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
            if (propsItemClassName) {
                return propsItemClassName(item);
            } else if (item.itemType === ItemType.Media) {
                const [source] = item.src.split(':');
                const playing = item.src === currentlyPlaying?.src ? 'playing' : '';
                const unplayable = item.unplayable ? 'unplayable' : '';
                return `source-${source} ${playing} ${unplayable}`;
            } else {
                return '';
            }
        },
        [currentlyPlaying, propsItemClassName]
    );

    return (
        <div className={`panel ${className}`}>
            <ListView
                {...props}
                className="media-list"
                layout={layout}
                items={items}
                itemClassName={itemClassName}
                itemKey={'src' as any} // TODO: remove cast
                onContextMenu={handleContextMenu}
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
                    selectedCount={selectedCount}
                />
            ) : null}
        </div>
    );
}

function isPlayable(item: MediaObject): boolean {
    return item.itemType === ItemType.Media || item.itemType === ItemType.Album;
}
