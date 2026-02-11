import React, {useRef} from 'react';
import {ConditionalKeys} from 'type-fest';
import ListViewBodyRow from './ListViewBodyRow';
import {Column, ListViewLayout} from './ListView';

export interface ListViewBodyProps<T> {
    listViewId: string;
    title: string;
    width?: number;
    pageSize: number;
    rowHeight: number;
    cols: readonly Column<T>[];
    items: readonly T[];
    itemKey: ConditionalKeys<T, string | number>;
    itemClassName: (item: T) => string;
    selectedId: string;
    selectedIds: Record<string, boolean>;
    scrollTop: number;
    overScan?: number;
    draggable?: boolean;
    dragIndex: number;
    multiple?: boolean;
    busy: boolean;
    cursor?: string;
    view: ListViewLayout<T>['view'];
}

export default function ListViewBody<T>({
    listViewId,
    title,
    width,
    pageSize,
    rowHeight,
    cols,
    items,
    itemKey,
    itemClassName,
    selectedId,
    selectedIds,
    scrollTop,
    overScan = 2,
    draggable,
    dragIndex,
    multiple = false,
    busy,
    cursor,
    view,
}: ListViewBodyProps<T>) {
    const ref = useRef<HTMLOListElement>(null);
    const size = items.length;
    const topIndex = Math.floor(scrollTop / rowHeight);
    const virtualStart = Math.max(0, topIndex - overScan);
    const virtualSize = Math.min(size, pageSize + 2 * overScan);
    const virtualItems = items.slice(virtualStart, virtualStart + virtualSize);

    return (
        <ol
            role="listbox"
            className="list-view-body"
            draggable={draggable}
            style={{
                width: width ? `${width}px` : undefined,
                cursor
            }}
            aria-label={title}
            aria-multiselectable={multiple}
            aria-activedescendant={selectedId}
            ref={ref}
        >
            {virtualItems.map((item, i) => (
                <ListViewBodyRow<T>
                    className={itemClassName(item)}
                    id={`${listViewId}-${item[itemKey]}`}
                    rowIndex={virtualStart + i}
                    height={rowHeight}
                    selected={(item[itemKey] as string) in selectedIds}
                    cols={cols}
                    item={item}
                    setSize={size}
                    dragIndex={dragIndex}
                    busy={busy}
                    view={view}
                    key={item[itemKey] as any}
                />
            ))}
        </ol>
    );
}
