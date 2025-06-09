import React from 'react';
import {Column} from './ListView';

export interface ListViewBodyCellProps<T> {
    rowIndex: number;
    col: Column<T>;
    item: T;
    busy: boolean;
}

export default function ListViewBodyCell<T>({
    rowIndex,
    col: {className = '', render, style},
    item,
    busy,
}: ListViewBodyCellProps<T>) {
    return (
        <div className={`list-view-cell ${className}`} style={style}>
            {render(item, rowIndex, busy)}
        </div>
    );
}
