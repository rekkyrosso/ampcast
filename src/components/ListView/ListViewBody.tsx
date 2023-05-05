import React, {useRef} from 'react';
import {ConditionalKeys} from 'type-fest';
import ListViewBodyRow from './ListViewBodyRow';
import {Column} from './ListView';

export interface ListViewBodyProps<T> {
    listViewId: string;
    title: string;
    width?: number;
    height: number;
    rowHeight: number;
    cols: Column<T>[];
    items: readonly T[];
    itemKey: ConditionalKeys<T, string | number>;
    itemClassName: (item: T) => string;
    selectedId: string;
    scrollTop: number;
    overScan?: number;
    selection: readonly T[];
    draggable?: boolean;
    dragIndex: number;
    multiple?: boolean;
}

export default function ListViewBody<T>({
    listViewId,
    title,
    width,
    height,
    rowHeight,
    cols,
    items,
    itemKey,
    itemClassName,
    selectedId,
    scrollTop,
    overScan = 2,
    selection,
    draggable,
    dragIndex,
    multiple = false,
}: ListViewBodyProps<T>) {
    const ref = useRef<HTMLOListElement>(null);
    const size = items.length;
    const topIndex = Math.floor(scrollTop / rowHeight);
    const pageSize = Math.floor(height / rowHeight);
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
                    selected={selection.includes(item)}
                    cols={cols}
                    item={item}
                    setSize={size}
                    dragIndex={dragIndex}
                    key={item[itemKey] as any}
                />
            ))}
        </ol>
    );
}
