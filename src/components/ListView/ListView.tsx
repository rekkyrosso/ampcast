import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {ConditionalKeys} from 'type-fest';
import pixel from 'assets/pixel.png.base64';
import SortOrder from 'types/SortOrder';
import globalDrag from 'services/globalDrag';
import Scrollable, {
    ScrollableClient,
    ScrollableHandle,
    ScrollablePosition,
} from 'components/Scrollable';
import FixedHeader from 'components/Scrollable/FixedHeader';
import useKeyboardBusy from 'hooks/useKeyboardBusy';
import useFontSize from 'hooks/useFontSize';
import useOnResize from 'hooks/useOnResize';
import usePrevious from 'hooks/usePrevious';
import ListViewHead from './ListViewHead';
import ListViewBody from './ListViewBody';
import useColumns from './useColumns';
import useSelectedItems from './useSelectedItems';
import './ListView.scss';

export interface ColumnSpec<T> {
    readonly title: string;
    readonly className?: string;
    readonly align?: 'left' | 'right' | 'center';
    readonly sortOrder?: SortOrder;
    readonly sortPriority?: number;
    readonly width?: number; // starting width (only in a sizeable layout)
    readonly render: (item: T, rowIndex: number) => React.ReactNode;
}

export interface Column<T> extends Required<ColumnSpec<T>> {
    readonly index: number;
    readonly left: number;
    readonly style: React.CSSProperties;
}

export interface ListViewDetailsLayout<T> {
    readonly view: 'details';
    readonly cols: ColumnSpec<T>[];
    readonly showTitles?: boolean;
    readonly sizeable?: boolean;
}

export interface ListViewCardLayout<T> {
    readonly view: 'card' | 'card compact' | 'card minimal';
    readonly cols: ColumnSpec<T>[];
}

export type ListViewLayout<T> = ListViewDetailsLayout<T> | ListViewCardLayout<T>;

export interface ListViewHandle {
    selectAll: () => void;
}

export interface ListViewProps<T> {
    layout: ListViewLayout<T>;
    items: readonly T[];
    itemKey: ConditionalKeys<T, string | number>;
    itemClassName?: (item: T) => string;
    sortable?: boolean;
    draggable?: boolean;
    droppable?: boolean;
    droppableTypes?: string[]; // mime types for file drops
    multiSelect?: boolean;
    reorderable?: boolean;
    className?: string;
    onClick?: (item: T, rowIndex: number) => void;
    onDoubleClick?: (item: T, rowIndex: number) => void;
    onContextMenu?: (items: readonly T[], x: number, y: number) => void;
    onDrop?: (items: readonly T[] | FileList, atIndex: number) => void;
    onMove?: (items: readonly T[], toIndex: number) => void;
    onDelete?: (items: readonly T[]) => void;
    onEnter?: (items: readonly T[], ctrlKey: boolean, shiftKey: boolean) => void;
    onInfo?: (items: readonly T[]) => void;
    onRowIndexChange?: (rowIndex: number) => void;
    onScrollIndexChange?: (rowIndex: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    onSelect?: (items: readonly T[]) => void;
    listViewRef?: React.MutableRefObject<ListViewHandle | null>;
}

const emptyString = () => '';
const dragImage = new Image(0, 0);
dragImage.src = pixel;

export default function ListView<T>({
    items = [],
    itemKey,
    itemClassName = emptyString,
    layout,
    className = '',
    draggable,
    droppable,
    droppableTypes = [],
    multiSelect,
    reorderable,
    onClick,
    onDoubleClick,
    onContextMenu,
    onDrop,
    onDelete,
    onEnter,
    onInfo,
    onRowIndexChange,
    onScrollIndexChange,
    onPageSizeChange,
    onSelect,
    onMove,
    listViewRef,
}: ListViewProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollableRef = useRef<ScrollableHandle>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const dragImageRef = useRef<HTMLUListElement>(null);
    const showTitles = layout.view === 'details' && layout.showTitles;
    const sizeable = layout.view === 'details' && layout.sizeable;
    const [rowIndex, setRowIndex] = useState(-1);
    const [scrollTop, setScrollTop] = useState(0);
    const [clientHeight, setClientHeight] = useState(0);
    const [clientWidth, setClientWidth] = useState(0);
    const [rowHeight, setRowHeight] = useState(0);
    const [cols, handleColumnResize] = useColumns(layout.cols, sizeable);
    const width = useMemo(() => cols.reduce((width, col) => (width += col.width), 0), [cols]);
    const pageSize = rowHeight ? Math.floor(clientHeight / rowHeight) - (showTitles ? 1 : 0) : 0;
    const size = items.length;
    const {selectedItems, selectAll, selectAt, selectRange, toggleSelectionAt} = useSelectedItems(
        items,
        itemKey,
        rowIndex
    );
    const fontSize = useFontSize();
    const [rangeSelectionStart, setRangeSelectionStart] = useState(-1);
    const [dragIndex, setDragIndex] = useState(-1);
    const [dragStartIndex, setDragStartIndex] = useState(-1);
    const isEmpty = size === 0;
    const wasEmpty = usePrevious(isEmpty) ?? true;
    const isDragging = dragStartIndex !== -1;
    const scrollIndex = rowHeight ? Math.floor(scrollTop / rowHeight) : 0;
    const keyboardBusy = useKeyboardBusy();
    const atStart = rowIndex === 0;
    const atEnd = rowIndex === size - 1;
    const busy = keyboardBusy && !(atStart || atEnd);
    const [debouncedSelectedItems, setDebouncedSelectedItems] = useState<readonly T[]>(
        () => selectedItems
    );
    const [dragItem1, dragItem2, dragItem3, dragItem4] = draggable ? selectedItems : [];

    useEffect(() => {
        if (listViewRef) {
            listViewRef.current = {
                selectAll,
            };
        }
    }, [listViewRef, selectAll]);

    useLayoutEffect(() => onRowIndexChange?.(rowIndex), [rowIndex, onRowIndexChange]);
    useLayoutEffect(() => onScrollIndexChange?.(scrollIndex), [scrollIndex, onScrollIndexChange]);
    useLayoutEffect(() => onPageSizeChange?.(pageSize), [pageSize, onPageSizeChange]);
    useLayoutEffect(() => onSelect?.(debouncedSelectedItems), [debouncedSelectedItems, onSelect]);

    useEffect(() => setRowIndex(Math.min(size - 1, rowIndex)), [size, rowIndex]);

    useEffect(() => {
        if (!busy) {
            setDebouncedSelectedItems(selectedItems);
        }
    }, [selectedItems, busy]);

    useEffect(() => {
        if (isEmpty) {
            setRowIndex(-1);
        } else if (wasEmpty) {
            setRowIndex(0);
            selectAt(0);
        }
    }, [isEmpty, wasEmpty, selectAt]);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            switch (event.key) {
                case 'Enter':
                    event.stopPropagation();
                    if (!event.repeat) {
                        onEnter?.(selectedItems, event.ctrlKey, event.shiftKey);
                    }
                    break;

                case 'Delete':
                    event.stopPropagation();
                    onDelete?.(selectedItems); // let this repeat
                    break;

                case 'i':
                    event.stopPropagation();
                    if (event.ctrlKey && !event.repeat) {
                        onInfo?.(selectedItems);
                        break;
                    }
                    break;

                case 'Info':
                    event.preventDefault();
                    event.stopPropagation();
                    if (!event.repeat) {
                        onInfo?.(selectedItems);
                    }
                    break;

                case 'a':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!event.repeat) {
                            selectAll();
                        }
                    }
                    break;

                case 'Shift':
                    if (!event.repeat) {
                        setRangeSelectionStart(rowIndex);
                    }
                    break;

                case ' ': // Space
                    event.preventDefault();
                    if (!event.repeat) {
                        if (event.ctrlKey) {
                            event.stopPropagation();
                            toggleSelectionAt(rowIndex); // toggle selected state
                        } else if (!selectedItems.includes(items[rowIndex])) {
                            event.stopPropagation();
                            toggleSelectionAt(rowIndex, true); // force selected state
                        }
                    }
                    break;

                default: {
                    const size = items.length;
                    const nextIndex = getNextIndexByKey(event.key, rowIndex, pageSize, size);
                    if (nextIndex !== -1) {
                        // valid scroll key
                        event.preventDefault();
                        if (nextIndex !== rowIndex) {
                            event.stopPropagation();
                            const scrollable = scrollableRef.current!;
                            const topIndex = Math.floor(scrollTop / rowHeight);
                            if (nextIndex >= topIndex + pageSize - 1) {
                                // too far below
                                const scrollHeight = (size + (showTitles ? 1 : 0)) * rowHeight;
                                const lastIndex = size - pageSize - 1;
                                const seekIndex = Math.min(size - 1, nextIndex + 1);
                                const topIndex = seekIndex - pageSize;
                                const top =
                                    topIndex === lastIndex ? scrollHeight : topIndex * rowHeight;
                                scrollable.scrollTo({top});
                            } else if (nextIndex <= topIndex) {
                                // too far above
                                const seekIndex = Math.max(0, nextIndex - 1);
                                const top = seekIndex * rowHeight;
                                scrollable.scrollTo({top});
                            }
                            setRowIndex(nextIndex);
                        }
                        if (multiSelect && event.shiftKey && rangeSelectionStart !== -1) {
                            selectRange(rangeSelectionStart, nextIndex);
                        } else if (!event.ctrlKey) {
                            selectAt(nextIndex);
                        }
                    }
                }
            }
        },
        [
            // Basically everything. :(
            rowIndex, // changes often
            items,
            pageSize,
            rowHeight,
            showTitles,
            onEnter,
            onDelete,
            onInfo,
            selectAll,
            selectAt,
            selectRange,
            toggleSelectionAt, // changes often
            selectedItems, // changes often
            multiSelect,
            rangeSelectionStart,
            scrollTop, // changes often
        ]
    );

    const handleMouseDown = useCallback(
        (event: React.MouseEvent) => {
            const newRowIndex = getRowIndexFromMouseEvent(event);
            if (newRowIndex !== -1) {
                setRowIndex(newRowIndex);
                if (multiSelect && event.ctrlKey) {
                    toggleSelectionAt(newRowIndex);
                } else if (multiSelect && event.shiftKey) {
                    if (rangeSelectionStart === -1) {
                        selectRange(newRowIndex, rowIndex);
                    } else {
                        selectRange(rangeSelectionStart, newRowIndex);
                    }
                } else if (!isRowSelectedFromMouseEvent(event)) {
                    selectAt(newRowIndex);
                }
            }
        },
        [selectAt, toggleSelectionAt, selectRange, rowIndex, rangeSelectionStart, multiSelect]
    );

    const handleMouseUp = useCallback(
        (event: React.MouseEvent) => {
            if (event.button === 0) {
                const rowIndex = getRowIndexFromMouseEvent(event);
                if (rowIndex !== -1) {
                    if (multiSelect && !event.ctrlKey && !event.shiftKey) {
                        selectAt(rowIndex);
                    }
                }
            }
        },
        [selectAt, multiSelect]
    );

    const handleKeyUp = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Shift') {
            setRangeSelectionStart(-1);
        }
    }, []);

    const handleResize = useCallback(({width, height}: ScrollableClient) => {
        setClientWidth(width);
        setClientHeight(height);
    }, []);

    const handleScroll = useCallback(({top}: ScrollablePosition) => {
        setScrollTop(top);
    }, []);

    useOnResize(
        cursorRef,
        useCallback(() => {
            setRowHeight(cursorRef.current!.getBoundingClientRect().height);
        }, [])
    );

    useLayoutEffect(() => {
        containerRef.current!.classList.toggle('thin', fontSize * 20 > clientWidth);
    }, [fontSize, clientWidth]);

    const handleClick = useCallback(
        (event: React.MouseEvent) => {
            const rowIndex = getRowIndexFromMouseEvent(event);
            if (rowIndex !== -1) {
                event.preventDefault();
                onClick?.(items[rowIndex], rowIndex);
            }
        },
        [items, onClick]
    );

    const handleContextMenu = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault();
            const rowIndex = getRowIndexFromMouseEvent(event);
            if (rowIndex !== -1) {
                onContextMenu?.(selectedItems, event.pageX, event.pageY);
            }
        },
        [selectedItems, onContextMenu]
    );

    const handleDoubleClick = useCallback(
        (event: React.MouseEvent) => {
            const rowIndex = getRowIndexFromMouseEvent(event);
            if (rowIndex !== -1) {
                event.preventDefault();
                onDoubleClick?.(items[rowIndex], rowIndex);
            }
        },
        [items, onDoubleClick]
    );

    useEffect(() => {
        const dragImage = dragImageRef.current!;
        while (dragImage.hasChildNodes()) {
            dragImage.removeChild(dragImage.lastChild!);
        }
        const items = Array.from(
            containerRef.current!.querySelectorAll(
                `.list-view-body:not(list-view-drag-image) li.selected`
            )
        );
        items.length = Math.min(items.length, 4);
        for (let i = 0; i < items.length; i++) {
            const item = items[i].cloneNode(true) as HTMLElement;
            item.style.transform = `translateY(${rowHeight * i}px)`;
            dragImage.appendChild(item);
        }
    }, [dragItem1, dragItem2, dragItem3, dragItem4, rowHeight]);

    const handleDragStart = useCallback(
        (event: React.DragEvent) => {
            const dataTransfer = event.dataTransfer;
            if (draggable || reorderable) {
                globalDrag.set(event, selectedItems);
                dataTransfer.setDragImage(dragImageRef.current!, -10, -10);
                if (draggable && reorderable) {
                    dataTransfer.effectAllowed = 'copyMove';
                } else if (draggable) {
                    dataTransfer.effectAllowed = 'copy';
                } else {
                    dataTransfer.effectAllowed = 'move';
                }
                setDragStartIndex(rowIndex);
            } else {
                dataTransfer.effectAllowed = 'none';
            }
        },
        [draggable, reorderable, selectedItems, rowIndex]
    );

    const handleDragOver = useCallback(
        (event: React.DragEvent) => {
            const dataTransfer = event.dataTransfer;
            if (droppable || reorderable) {
                const hasItems = dataTransfer.types.includes('text/plain');
                let rowIndex = getRowIndexFromMouseEvent(event);
                if (rowIndex === -1) {
                    rowIndex = size;
                }
                if (isDragging) {
                    if (reorderable && hasItems) {
                        dataTransfer.dropEffect = 'move';
                        setDragIndex(rowIndex);
                    } else {
                        dataTransfer.dropEffect = 'none';
                        setDragIndex(-1);
                    }
                } else {
                    if (
                        droppable &&
                        (hasItems || hasDroppableType(dataTransfer.items, droppableTypes))
                    ) {
                        dataTransfer.dropEffect = 'copy';
                        setDragIndex(rowIndex);
                    } else {
                        dataTransfer.dropEffect = 'none';
                        setDragIndex(-1);
                    }
                }
            } else if (isDragging) {
                dataTransfer.dropEffect = 'copy';
            } else {
                dataTransfer.dropEffect = 'none';
                setDragIndex(-1);
            }
            event.preventDefault();
            event.stopPropagation();
        },
        [size, isDragging, droppable, droppableTypes, reorderable]
    );

    const handleDrop = useCallback(
        (event: React.DragEvent) => {
            if (droppable || reorderable) {
                const dataTransfer = event.dataTransfer;
                let rowIndex = getRowIndexFromMouseEvent(event);
                if (rowIndex === -1) {
                    rowIndex = size;
                }
                if (dataTransfer.effectAllowed === 'copy') {
                    const items: T[] | null = globalDrag.get(event);
                    if (items) {
                        onDrop?.(items, rowIndex);
                    }
                } else if (dataTransfer.effectAllowed === 'move') {
                    const offset = dragStartIndex < rowIndex ? -1 : 0;
                    onMove?.(selectedItems, rowIndex);
                    setRowIndex(rowIndex + offset);
                } else if (droppable && hasDroppableType(dataTransfer.items, droppableTypes)) {
                    onDrop?.(dataTransfer.files, rowIndex);
                }
            }
            setDragIndex(-1);
            event.preventDefault();
            event.stopPropagation();
        },
        [
            size,
            selectedItems,
            droppable,
            droppableTypes,
            reorderable,
            dragStartIndex,
            onDrop,
            onMove,
        ]
    );

    const handleDragEnd = useCallback(() => {
        globalDrag.unset();
        setDragStartIndex(-1);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragIndex(-1);
    }, []);

    return (
        <div
            className={`list-view list-view-${layout.view} ${className}`}
            tabIndex={0}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            onDoubleClick={handleDoubleClick}
            onDragStart={handleDragStart}
            onDragEnter={handleDragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            ref={containerRef}
        >
            <Scrollable
                scrollWidth={sizeable ? width : undefined}
                scrollHeight={(size + (droppable ? 1 : 0) + (showTitles ? 1 : 0)) * rowHeight}
                scrollAmount={rowHeight}
                droppable={droppable || (reorderable && isDragging)}
                onResize={handleResize}
                onScroll={handleScroll}
                scrollableRef={scrollableRef}
            >
                {showTitles && (
                    <FixedHeader>
                        <ListViewHead
                            width={width}
                            height={rowHeight}
                            sizeable={sizeable}
                            cols={cols}
                            onColumnResize={handleColumnResize}
                        />
                    </FixedHeader>
                )}
                <ListViewBody
                    width={sizeable ? width : undefined}
                    height={clientHeight}
                    rowHeight={rowHeight}
                    cols={cols}
                    items={items}
                    itemKey={itemKey}
                    itemClassName={itemClassName}
                    scrollTop={scrollTop}
                    selection={selectedItems}
                    dragIndex={dragIndex}
                    draggable={draggable || reorderable}
                />
                <div
                    className="list-view-cursor"
                    style={{
                        width: sizeable ? `${width}px` : undefined,
                        transform: `translateY(${rowIndex * rowHeight}px)`,
                    }}
                    ref={cursorRef}
                />
                <ul className="list-view-drag-image list-view-body" ref={dragImageRef} />
            </Scrollable>
        </div>
    );
}

function getRowIndexFromMouseEvent(event: React.MouseEvent): number {
    let rowIndex = 0;
    const row = getRowFromMouseEvent(event);
    if (row) {
        rowIndex = Number(row.getAttribute('aria-posinset')) || 0;
    }
    return rowIndex - 1;
}

function isRowSelectedFromMouseEvent(event: React.MouseEvent): boolean {
    const row = getRowFromMouseEvent(event);
    return row?.classList.contains('selected') || false;
}

function getRowFromMouseEvent(event: React.MouseEvent): HTMLElement | null {
    let target: HTMLElement | null = event.target as HTMLElement;
    while (target && !target?.hasAttribute('aria-posinset')) {
        target = target.parentElement;
    }
    return target;
}

function getNextIndexByKey(
    key: string,
    index: number,
    pageSize: number,
    totalSize: number
): number {
    switch (key) {
        case 'ArrowUp':
            index -= 1;
            break;

        case 'ArrowDown':
            index += 1;
            break;

        case 'PageUp':
            index -= pageSize - 1;
            break;

        case 'PageDown':
            index += pageSize - 1;
            break;

        case 'Home':
            index = 0;
            break;

        case 'End':
            index = totalSize - 1;
            break;

        default:
            return -1;
    }

    return Math.min(Math.max(index, 0), totalSize - 1);
}

function hasDroppableType(items: DataTransferItemList, droppableTypes: string[]): boolean {
    const compareTypes = (a: string, b: string): boolean => {
        const [typeA, subtypeA] = a.split('/');
        const [typeB, subtypeB] = b.split('/');
        return typeA === typeB && (subtypeA === subtypeB || subtypeA === '*');
    };
    return (
        Array.from(items).findIndex((item) =>
            droppableTypes.some((type) => compareTypes(type, item.type))
        ) !== -1
    );
}
