import React from 'react';
import {Column} from './ListView';

export interface ListViewHeadCellProps<T>
    extends Pick<Column<T>, 'index' | 'title' | 'style' | 'onContextMenu'> {
    draggable?: boolean;
    insertBefore?: boolean;
}

export default function ListViewHeadCell<T>({
    index,
    title,
    style,
    draggable,
    insertBefore,
    onContextMenu,
}: ListViewHeadCellProps<T>) {
    return (
        <div
            className={`list-view-cell ${insertBefore ? 'insert-before' : ''}`}
            data-index={index}
            style={style}
            draggable={draggable}
            onContextMenu={onContextMenu}
        >
            {title}
        </div>
    );
}
