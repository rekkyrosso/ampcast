import React from 'react';
import {Column} from './ListView';

export interface ListViewBodyCellProps<T> {
    rowIndex: number;
    col: Column<T>;
    item: T;
}

export default function ListViewBodyCell<T>({
    rowIndex,
    col: {className = '', render, style},
    item,
}: ListViewBodyCellProps<T>) {
    return (
        <div className={`list-view-cell ${className}`} style={style}>
            {render(item, rowIndex)}
        </div>
    );
}
