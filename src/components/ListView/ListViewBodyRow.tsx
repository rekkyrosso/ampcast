import React from 'react';
import {Column} from './ListView';
import ListViewBodyCell from './ListViewBodyCell';

export interface ListViewRowProps<T> {
    item: T;
    className: string;
    id: string;
    rowIndex: number;
    height: number;
    selected: boolean;
    cols: readonly Column<T>[];
    setSize: number;
    dragIndex: number;
    busy: boolean;
}

export default function ListViewRow<T>({
    item,
    className,
    id,
    rowIndex,
    height,
    selected,
    cols,
    setSize,
    dragIndex,
    busy,
}: ListViewRowProps<T>) {
    const classNames = `${className} ${selected ? 'selected selected-text' : ''} ${
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
            id={id}
            aria-selected={selected}
            aria-setsize={setSize}
            aria-posinset={rowIndex + 1}
            style={{
                height: `${height}px`,
                transform: `translateY(${height * rowIndex}px)`,
            }}
        >
            {cols.map((col) => (
                <ListViewBodyCell
                    rowIndex={rowIndex}
                    col={col}
                    item={item}
                    busy={busy}
                    key={col.id}
                />
            ))}
        </li>
    );
}
