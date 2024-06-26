import React from 'react';
import {cancelEvent} from 'utils';
import {Column} from './ListView';
import ListViewHeadCell from './ListViewHeadCell';
import ColumnResizer from './ColumnResizer';

export interface ListViewHeadProps<T> {
    width: number;
    height: number;
    cols: readonly Column<T>[];
    fontSize: number;
    sizeable?: boolean;
    onColumnResize: (index: number, width: number) => void;
}

export default function ListViewHead<T>({
    width,
    height,
    cols,
    fontSize,
    sizeable,
    onColumnResize,
}: ListViewHeadProps<T>) {
    return (
        <header
            className="list-view-head"
            style={{
                width: `${width}px`,
            }}
            onContextMenu={cancelEvent}
        >
            <div
                className="list-view-row"
                style={{
                    width: `${width}px`,
                    height: `${height}px`,
                }}
            >
                {cols.map((col) => (
                    <ListViewHeadCell {...col} key={col.index} />
                ))}{' '}
                {sizeable &&
                    cols.map((col) => (
                        <ColumnResizer
                            col={col}
                            fontSize={fontSize}
                            onResize={onColumnResize}
                            key={col.index}
                        />
                    ))}
            </div>
        </header>
    );
}
