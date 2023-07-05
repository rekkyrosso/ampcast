import {useCallback, useEffect, useState} from 'react';
import {Column, ListViewLayout} from './ListView';

export default function useColumns<T>(layout: ListViewLayout<T>) {
    const [cols, setCols] = useState<Column<T>[]>([]);
    const sizeable = layout.view === 'details' && layout.sizeable;

    useEffect(() => {
        const isDetailsView = layout.view === 'details';
        const sizeable = isDetailsView && layout.sizeable;
        setCols(
            layout.cols.reduce<Column<T>[]>((cols, spec, index) => {
                const prevCol = cols[index - 1];
                const left = prevCol ? prevCol.left + prevCol.width : 0;
                const {title = '', className = '', align = 'left', width = 200} = spec;
                const style = sizeable
                    ? {
                          left: `${left}px`,
                          width: `${width}px`,
                          textAlign: align,
                      }
                    : isDetailsView
                    ? {
                          textAlign: align,
                      }
                    : {};
                cols.push({
                    ...spec,
                    title,
                    className,
                    align,
                    index,
                    left,
                    width,
                    style,
                });
                return cols;
            }, [])
        );
    }, [layout]);

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
