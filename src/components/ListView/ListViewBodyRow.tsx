import React from 'react';
import {Column} from './ListView';
import ListViewBodyCell from './ListViewBodyCell';

export interface ListViewRowProps<T> {
    item: T;
    className: string;
    rowIndex: number;
    height: number;
    selected: boolean;
    cols: Column<T>[];
    setSize: number;
    dragIndex: number;
}

export default function ListViewRow<T>({
    item,
    className,
    rowIndex,
    height,
    selected,
    cols,
    setSize,
    dragIndex,
}: ListViewRowProps<T>) {
    const classNames = `${className} ${selected ? 'selected' : ''} ${
        dragIndex === setSize
            ? rowIndex === setSize - 1
                ? 'drag-over-last'
                : ''
            : dragIndex === rowIndex
            ? 'drag-over'
            : ''
    }`;

    return (
        <li
            role="option"
            className={`list-view-row ${classNames}`}
            aria-selected={selected ? 'true' : undefined}
            aria-setsize={setSize}
            aria-posinset={rowIndex + 1}
            style={{
                height: `${height}px`,
                transform: `translateY(${height * rowIndex}px)`,
            }}
        >
            {cols.map((col) => (
                <ListViewBodyCell rowIndex={rowIndex} col={col} item={item} key={col.title} />
            ))}
        </li>
    );
}
