import React, {useCallback} from 'react';
import {Column} from './ListView';
import ListViewHeadCell from './ListViewHeadCell';
import ColumnResizer from './ColumnResizer';

export interface ListViewHeadProps<T> {
    width: number;
    height: number;
    cols: Column<T>[];
    sizeable?: boolean;
    onColumnResize?: (index: number, width: number) => void;
}

export default function ListViewHead<T>({
    width,
    height,
    cols,
    sizeable,
    onColumnResize,
}: ListViewHeadProps<T>) {
    const handleResize = useCallback(
        (index: number, width: number) => {
            onColumnResize?.(index, width);
        },
        [onColumnResize]
    );

    return (
        <header
            className="list-view-head"
            style={{
                width: `${width}px`,
            }}
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
                        <ColumnResizer col={col} onResize={handleResize} key={col.index} />
                    ))}
            </div>
        </header>
    );
}
