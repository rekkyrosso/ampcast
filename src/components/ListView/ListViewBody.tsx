import React, {useMemo, useRef} from 'react';
import {ConditionalKeys} from 'type-fest';
import ListViewBodyRow from './ListViewBodyRow';
import {Column} from './ListView';

export interface ListViewBodyProps<T> {
    width?: number;
    height: number;
    rowHeight: number;
    cols: Column<T>[];
    items: readonly T[];
    itemKey: ConditionalKeys<T, string | number>;
    itemClassName: (item: T) => string;
    scrollTop: number;
    overScan?: number;
    selection: readonly T[];
    draggable?: boolean;
    dragIndex: number;
}

export default function ListViewBody<T>({
    width,
    height,
    rowHeight,
    cols,
    items,
    itemKey,
    itemClassName,
    scrollTop,
    overScan = 1,
    selection,
    draggable,
    dragIndex,
}: ListViewBodyProps<T>) {
    const ref = useRef<HTMLOListElement>(null);
    const size = items.length;
    const topIndex = Math.floor(scrollTop / rowHeight);
    const pageSize = Math.floor(height / rowHeight);
    const virtualStart = Math.max(0, topIndex - overScan);
    const virtualSize = Math.min(size, pageSize + 2 * overScan);
    const virtualItems = useMemo(() => {
        return items.slice(virtualStart, virtualStart + virtualSize);
    }, [items, virtualStart, virtualSize]);

    return (
        <ol
            role="listbox"
            className="list-view-body"
            draggable={draggable}
            style={{
                width: width ? `${width}px` : undefined,
            }}
            ref={ref}
        >
            {virtualItems.map((item, i) => (
                <ListViewBodyRow<T>
                    className={itemClassName(item)}
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
