import React, {useCallback} from 'react';
import SortParams from 'types/SortParams';
import {Column} from './ListView';

export interface ListViewHeadCellProps<T> extends Pick<
    Column<T>,
    'id' | 'index' | 'title' | 'align' | 'style' | 'onContextMenu'
> {
    draggable?: boolean;
    sortable?: boolean;
    sortOrder?: 1 | -1;
    savedSortOrder?: 1 | -1;
    insertBefore?: boolean;
    onSort?: (params: SortParams) => void;
}

export default function ListViewHeadCell<T>({
    id,
    index,
    title,
    align,
    style,
    draggable,
    sortable,
    sortOrder,
    savedSortOrder,
    insertBefore,
    onContextMenu,
    onSort,
}: ListViewHeadCellProps<T>) {
    const handleClick = useCallback(() => {
        onSort?.({
            sortBy: id,
            sortOrder: sortOrder === 1 ? -1 : sortOrder === -1 ? 1 : savedSortOrder || 1,
        });
    }, [id, sortOrder, savedSortOrder, onSort]);

    return (
        <div
            className={`list-view-cell ${sortable ? 'sortable' : ''} ${align ? 'align-' + align : ''} ${insertBefore ? 'insert-before' : ''}`}
            data-index={index}
            style={style}
            draggable={draggable}
            onClick={sortable ? handleClick : undefined}
            onContextMenu={onContextMenu}
        >
            <span className="text">{title}</span>
            <svg className="icon marker" viewBox="0 0 150 150">
                {savedSortOrder ? <title>Saved sort</title> : null}
                {sortable ? (
                    <>
                        {sortOrder === -1 ? (
                            <polygon points="45,105 75,45 105,105" strokeWidth="10" />
                        ) : sortOrder === 1 ? (
                            <polygon points="45,45 75,105 105,45" strokeWidth="10" />
                        ) : savedSortOrder === -1 ? (
                            <polygon points="45,105 75,45 105,105" strokeWidth="10" fill="none" />
                        ) : (
                            <polygon points="45,45 75,105 105,45" strokeWidth="10" fill="none" />
                        )}
                        {savedSortOrder ? (
                            <circle
                                cx="125"
                                cy={savedSortOrder === -1 ? 50 : 100}
                                r="10"
                                strokeWidth="10"
                                fill={sortOrder === savedSortOrder ? undefined : 'none'}
                            />
                        ) : null}
                    </>
                ) : null}
            </svg>
        </div>
    );
}
