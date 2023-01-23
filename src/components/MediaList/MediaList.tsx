import React, {useCallback, useEffect, useState} from 'react';
import {Except} from 'type-fest';
import Action from 'types/Action';
import MediaObject from 'types/MediaObject';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager from 'types/Pager';
import {performAction} from 'services/actions';
import ListView, {ListViewProps} from 'components/ListView';
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
    onSelect,
    ...props
}: MediaListProps<T>) {
    const [key, setKey] = useState(0);
    const layout = useMediaListLayout(props.layout);
    const [rowIndex, setRowIndex] = useState(0);
    const [pageSize, setPageSize] = useState(0);
    const [{items, loaded, error, size, maxSize}, fetchAt] = usePager(pager, keepAlive);
    const [selectedCount, setSelectedCount] = useState(0);

    useEffect(() => setKey((key) => key + 1), [pager]);

    useEffect(() => {
        if (rowIndex >= 0 && pageSize > 0) {
            fetchAt(rowIndex, pageSize);
        }
    }, [
        fetchAt,
        rowIndex,
        pageSize,
        pager, // re-fetch on `pager` change
    ]);

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

    const onDoubleClick = useCallback(async (item: T) => {
        await performAction(Action.Queue, [item]);
    }, []);

    const onEnter = useCallback(
        async (items: readonly T[], ctrlKey: boolean, shiftKey: boolean) => {
            if (!ctrlKey && !shiftKey) {
                await performAction(Action.Queue, items);
            } else if (ctrlKey && !shiftKey) {
                await performAction(Action.PlayNow, items);
            } else if (shiftKey && !ctrlKey) {
                await performAction(Action.PlayNext, items);
            }
        },
        []
    );

    const onInfo = useCallback(async (items: readonly T[]) => {
        await performAction(Action.Info, items);
    }, []);

    return (
        <div className={`panel ${className}`}>
            <ListView
                {...props}
                className="media-list"
                layout={layout}
                items={items}
                itemKey={'src' as any} // TODO: remove cast
                onContextMenu={handleContextMenu}
                onDoubleClick={onDoubleClick}
                onEnter={onEnter}
                onInfo={onInfo}
                onPageSizeChange={setPageSize}
                onScrollIndexChange={setRowIndex}
                onSelect={handleSelect}
                key={key} // reset selection
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
