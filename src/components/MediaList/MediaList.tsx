import React, {useCallback, useEffect, useState} from 'react';
import {Except} from 'type-fest';
import MediaObject from 'types/MediaObject';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager from 'types/Pager';
import ListView, {ListViewProps} from 'components/ListView';
import usePager from 'hooks/usePager';
import MediaListStatusBar from './MediaListStatusBar';
import useMediaListLayout from './useMediaListLayout';
import './MediaList.scss';

export interface MediaListProps<T extends MediaObject>
    extends Except<ListViewProps<T>, 'items' | 'itemKey' | 'layout'> {
    pager?: Pager<T> | null;
    keepAlive?: boolean;
    layout?: MediaSourceLayout<T>;
    statusBar?: boolean;
    loadingText?: string;
    unplayable?: boolean;
}

export default function MediaList<T extends MediaObject>({
    className = '',
    pager = null,
    keepAlive,
    statusBar = true,
    loadingText,
    onSelect,
    unplayable,
    ...props
}: MediaListProps<T>) {
    const layout = useMediaListLayout(props.layout);
    const [rowIndex, setRowIndex] = useState(0);
    const [pageSize, setPageSize] = useState(0);
    const [{items, loaded, error, size, maxSize}, fetchAt] = usePager(pager, keepAlive);
    const [selectedCount, setSelectedCount] = useState(0);

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

    return (
        <div className={`panel ${className}`}>
            <ListView
                {...props}
                className={`media-list ${unplayable ? '' : 'playable'}`}
                layout={layout}
                items={items}
                itemKey={'src' as any} // TODO: remove cast
                onPageSizeChange={setPageSize}
                onScrollIndexChange={setRowIndex}
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
