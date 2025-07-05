import React from 'react';
import {Column, ListViewLayout} from './ListView';

export interface ListViewBodyCellProps<T> {
    rowIndex: number;
    col: Column<T>;
    item: T;
    busy: boolean;
    view: ListViewLayout<T>['view'];
}

export default function ListViewBodyCell<T>({
    rowIndex,
    col: {className = '', render, style},
    item,
    busy,
    view,
}: ListViewBodyCellProps<T>) {
    return (
        <div className={`list-view-cell ${className}`} style={style}>
            {render(item, {rowIndex, busy, view})}
        </div>
    );
}
