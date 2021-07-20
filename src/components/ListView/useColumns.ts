import {useCallback, useEffect, useState} from 'react';
import {Column, ColumnSpec} from './ListView';

export default function useColumns<T>(specs: ColumnSpec<T>[], sizeable = false) {
    const [cols, setCols] = useState<Column<T>[]>([]);

    useEffect(() => {
        setCols(
            specs.reduce<Column<T>[]>((cols, spec, index) => {
                const prevCol = cols[index - 1];
                const left = prevCol ? prevCol.left + prevCol.width : 0;
                const {
                    className = '',
                    align = 'left',
                    sortOrder = 'none',
                    sortPriority = 0,
                    width = 200,
                } = spec;
                const style =
                    sizeable
                        ? {
                              left: `${left}px`,
                              width: `${width}px`,
                              textAlign: align,
                          }
                        : {
                              textAlign: align,
                          };
                cols.push({
                    ...spec,
                    className,
                    align,
                    index,
                    left,
                    width,
                    style,
                    sortOrder,
                    sortPriority,
                });
                return cols;
            }, [])
        );
    }, [specs, sizeable]);

    const handleColumnResize = useCallback(
        (colIndex: number, newWidth: number) => {
            if (sizeable && cols[colIndex].width !== newWidth) {
                setCols(
                    cols.reduce<Column<T>[]>((cols, col, index) => {
                        if (index >= colIndex) {
                            const prevCol = cols[index - 1];
                            const left = prevCol ? prevCol.left + prevCol.width : 0;
                            const width = index === colIndex ? newWidth : col.width;
                            const style = {
                                left: `${left}px`,
                                width: `${width}px`,
                                textAlign: col.align,
                            };
                            cols.push({...col, left, width, style});
                        } else {
                            cols.push(col);
                        }
                        return cols;
                    }, [])
                );
            }
        },
        [cols, sizeable]
    );

    return [cols, handleColumnResize] as const;
}
