import {useCallback, useLayoutEffect, useState} from 'react';
import {preventDefault} from 'utils';
import usePrevious from 'hooks/usePrevious';
import {Column, ListViewLayout} from './ListView';

export default function useColumns<T>(
    layout: ListViewLayout<T>,
    fontSize: number,
    storageId?: string
) {
    const [cols, setCols] = useState<readonly Column<T>[]>([]);
    const prevLayout = usePrevious(layout);

    useLayoutEffect(() => {
        setCols((prevCols) => {
            const cols = layout === prevLayout ? prevCols : getColumns(layout, storageId);
            if (fontSize && layout.view === 'details' && layout.sizeable) {
                return cols.reduce<Column<T>[]>((cols, col, index) => {
                    const prevCol = cols[index - 1];
                    cols.push(getColumn(col, prevCol, col.width, fontSize));
                    return cols;
                }, []);
            }
            return cols;
        });
    }, [layout, prevLayout, fontSize, storageId]);

    const onColumnResize = useCallback(
        (col: Column<T>, colWidth: number) => {
            const colIndex = col.index;
            setCols((cols) => {
                const newWidth = colWidth / fontSize;
                if (cols[colIndex].width !== newWidth) {
                    return cols.reduce<Column<T>[]>((cols, col, index) => {
                        if (index >= colIndex) {
                            const prevCol = cols[index - 1];
                            const width = index === colIndex ? newWidth : col.width;
                            cols.push(getColumn(col, prevCol, width, fontSize));
                            if (storageId && index === colIndex && col.id) {
                                localStorage.setItem(
                                    `listView/${storageId}/${col.id}`,
                                    String(width)
                                );
                            }
                        } else {
                            cols.push(col);
                        }
                        return cols;
                    }, []);
                }
                return cols;
            });
        },
        [fontSize, storageId]
    );

    return {cols, onColumnResize};
}

function getColumns<T>(layout: ListViewLayout<T>, storageId?: string): readonly Column<T>[] {
    return layout.cols.reduce<Column<T>[]>((cols, spec, index) => {
        const prevCol = cols[index - 1];
        const left = prevCol ? prevCol.left + prevCol.width : 0;
        const {
            id = String(index),
            title = '',
            className = '',
            align = 'left',
            onContextMenu = preventDefault,
        } = spec;
        const width =
            (storageId && id ? Number(localStorage.getItem(`listView/${storageId}/${id}`)) : 0) ||
            spec.width ||
            12.5;
        const style = layout.view === 'details' ? {textAlign: align} : {};
        cols.push({
            ...spec,
            id,
            title,
            className,
            align,
            index,
            left,
            width,
            style,
            onContextMenu,
        });
        return cols;
    }, []);
}

function getColumn<T>(
    col: Column<T>,
    prevCol: Column<T> | undefined,
    width: number,
    fontSize: number
): Column<T> {
    const left = prevCol ? prevCol.left + prevCol.width : 0;
    const style = {
        left: `${left * fontSize}px`,
        width: `${width * fontSize}px`,
        textAlign: col.align,
    };
    return {...col, left, width, style};
}
