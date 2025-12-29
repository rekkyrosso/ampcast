import React, {useCallback, useEffect, useId, useRef, useState} from 'react';
import {ConditionalKeys} from 'type-fest';
import globalDrag from 'services/globalDrag';
import {browser} from 'utils';
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
    readonly id?: string;
    readonly title?: React.ReactNode;
    readonly className?: string;
    readonly align?: 'left' | 'right' | 'center';
    readonly width?: number; // starting width (only in a sizeable layout)
    readonly render: (
        item: T,
        info: {
            view: ListViewLayout<T>['view'];
            rowIndex: number;
            busy: boolean; // Scrolling
        }
    ) => React.ReactNode;
    readonly onContextMenu?: (event: React.MouseEvent) => void;
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
    readonly view: 'card' | 'card compact' | 'card small' | 'card minimal';
    readonly cols: ColumnSpec<T>[];
}

export type ListViewLayout<T> = ListViewDetailsLayout<T> | ListViewCardLayout<T>;

export interface ListViewHandle {
    focus: () => void;
    scrollIntoView: (rowIndex: number) => void;
    scrollTo: (rowIndex: number) => void;
    selectAll: () => void;
    selectAt: (rowIndex: number) => void;
}

export interface ListViewProps<T> {
    layout: ListViewLayout<T>;
    items: readonly T[];
    itemKey: ConditionalKeys<T, string | number>;
    title: string;
    storageId?: string;
    itemClassName?: (item: T) => string;
    selectedIndex?: number;
    sortable?: boolean;
    draggable?: boolean;
    droppable?: boolean;
    droppableTypes?: readonly string[]; // mime types for file drops
    moveable?: boolean; // Can reorder rows.
    multiple?: boolean;
    reorderable?: boolean; // Can reorder columns.
    disabled?: boolean;
    className?: string;
    emptyMessage?: React.ReactNode;
    onClick?: (item: T, rowIndex: number) => void;
    onDoubleClick?: (item: T, rowIndex: number) => void;
    onContextMenu?: (
        items: readonly T[],
        x: number,
        y: number,
        button: number,
        rowIndex: number
    ) => void;
    onDrop?: (items: readonly T[] | readonly File[] | DataTransferItem, atIndex: number) => void;
    onMove?: (items: readonly T[], toIndex: number) => void;
    onDelete?: (items: readonly T[]) => void;
    onEnter?: (items: readonly T[], cmdKey: boolean, shiftKey: boolean) => void;
    onInfo?: (items: readonly T[]) => void;
    onReorder?: (col: Column<T>, toIndex: number) => void;
    onRowIndexChange?: (rowIndex: number) => void;
    onScrollIndexChange?: (scrollIndex: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    onSelect?: (items: readonly T[]) => void;
    ref?: React.RefObject<ListViewHandle | null>;
}

const emptyString = () => '';

const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'];

export default function ListView<T>({
    items = [],
    itemKey,
    title,
    storageId,
    itemClassName = emptyString,
    layout,
    className = '',
    selectedIndex = items.length === 0 ? -1 : 0,
    draggable,
    droppable,
    droppableTypes = [],
    multiple,
    moveable,
    reorderable,
    disabled,
    emptyMessage,
    onClick,
    onDoubleClick,
    onContextMenu,
    onDrop,
    onDelete,
    onEnter,
    onInfo,
    onMove,
    onRowIndexChange,
    onScrollIndexChange,
    onPageSizeChange,
    onReorder,
    onSelect,
    ref,
}: ListViewProps<T>) {
    const listViewId = useId();
    const internalRef = useRef<ListViewHandle | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollableRef = useRef<ScrollableHandle>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const dragImageRef = useRef<HTMLUListElement>(null);
    const fontSize = useFontSize(containerRef);
    const showTitles = layout.view === 'details' && layout.showTitles;
    const sizeable = layout.view === 'details' && layout.sizeable;
    const [rowIndex, setRowIndex] = useState(selectedIndex);
    const [scrollPosition, setScrollPosition] = useState<ScrollablePosition>({left: 0, top: 0});
    const {top: scrollTop, left: scrollLeft} = scrollPosition;
    const [isScrolling, setIsScrolling] = useState(false);
    const [clientHeight, setClientHeight] = useState(0);
    const [clientWidth, setClientWidth] = useState(0);
    const [rowHeight, setRowHeight] = useState(0);
    const {cols, onColumnResize} = useColumns(layout, fontSize, storageId);
    const width = cols.reduce((width, col) => (width += col.width), 0) * fontSize;
    const pageSize =
        rowHeight && clientHeight
            ? Math.max(Math.ceil(clientHeight / rowHeight), 1) - (showTitles ? 1 : 0)
            : 0;
    const size = items.length;
    const {selectedItems, selectedIds, selectAll, selectAt, selectRange, toggleSelectionAt} =
        useSelectedItems(items, itemKey, rowIndex);
    const hasSelection = selectedItems.length > 0;
    const [rangeSelectionStart, setRangeSelectionStart] = useState(-1);
    const [dragIndex, setDragIndex] = useState(-1);
    const [dragStartIndex, setDragStartIndex] = useState(-1);
    const isEmpty = size === 0;
    const isDragging = dragStartIndex !== -1;
    const keyboardBusy = useKeyboardBusy(scrollKeys);
    const atStart = rowIndex === 0;
    const atEnd = rowIndex === size - 1;
    const busy = keyboardBusy && !(atStart || atEnd);
    const prevItems = usePrevious(items);
    const [debouncedSelectedItems, setDebouncedSelectedItems] = useState(selectedItems);
    const [dragItem1, dragItem2, dragItem3, dragItem4] = draggable || moveable ? selectedItems : [];
    const selectedId = items[rowIndex] ? `${listViewId}-${items[rowIndex][itemKey]}` : '';
    const isThin = clientWidth < fontSize * 20;
    const hasFocus = containerRef.current && containerRef.current === document.activeElement;
    const dropTargetPadding = droppable ? Math.min(2 * fontSize, rowHeight) : 0;

    const focus = useCallback(() => containerRef.current?.focus(), []);

    const scrollTo = useCallback(
        (rowIndex: number) => {
            rowIndex = Math.min(Math.max(rowIndex, 0), size - 1);
            const scrollable = scrollableRef.current!;
            const topIndex = Math.floor(scrollTop / rowHeight);
            if (rowIndex >= topIndex + pageSize - 1) {
                // too far below
                const scrollHeight = (size + (showTitles ? 1 : 0)) * rowHeight;
                const lastIndex = size - pageSize - 1;
                const seekIndex = Math.min(size - 1, rowIndex + 2);
                const topIndex = seekIndex - pageSize;
                const top = topIndex === lastIndex ? scrollHeight : topIndex * rowHeight;
                scrollable.scrollTo({top});
            } else if (rowIndex <= topIndex) {
                // too far above
                const seekIndex = Math.max(0, rowIndex - 1);
                const top = seekIndex * rowHeight;
                scrollable.scrollTo({top});
            }
        },
        [scrollTop, rowHeight, pageSize, showTitles, size]
    );

    useEffect(() => {
        internalRef.current = {
            focus,
            scrollIntoView: (index: number) => {
                const rowIndex = Math.min(Math.max(index, 0), size - 1);
                scrollTo(rowIndex);
                setRowIndex(rowIndex);
                selectAt(index); // Not `rowIndex`.
            },
            scrollTo,
            selectAll,
            selectAt,
        };
        if (ref) {
            ref.current = Object.assign(ref.current || {}, internalRef.current);
        }
    }, [ref, focus, scrollTo, selectAll, selectAt, size]);

    useEffect(() => {
        if (selectedIndex !== undefined) {
            internalRef.current?.scrollIntoView(selectedIndex);
        }
    }, [selectedIndex]);

    useEffect(() => onRowIndexChange?.(rowIndex), [rowIndex, onRowIndexChange]);

    useEffect(() => {
        const scrollIndex = rowHeight ? Math.floor(scrollTop / rowHeight) : 0;
        onScrollIndexChange?.(scrollIndex);
    }, [rowHeight, scrollTop, onScrollIndexChange]);

    useEffect(() => {
        if (pageSize && onPageSizeChange) {
            onPageSizeChange(pageSize);
        }
    }, [pageSize, onPageSizeChange]);

    useEffect(() => onSelect?.(debouncedSelectedItems), [debouncedSelectedItems, onSelect]);

    useEffect(() => setRowIndex(Math.min(size - 1, rowIndex)), [size, rowIndex]);

    useEffect(() => {
        if (scrollTop) {
            setIsScrolling(true);
            const timer = setTimeout(() => setIsScrolling(false), 100);
            return () => clearTimeout(timer);
        } else {
            setIsScrolling(false);
        }
    }, [scrollTop]);

    useEffect(() => {
        if (prevItems) {
            const prevItem = prevItems[rowIndex];
            if (prevItem) {
                const index = items.findIndex(
                    (item) => item && item[itemKey] === prevItem[itemKey]
                );
                if (index !== -1) {
                    setRowIndex(index);
                }
            }
        }
    }, [items, prevItems, rowIndex, itemKey]);

    useEffect(() => {
        if (!busy) {
            setDebouncedSelectedItems(selectedItems);
        }
    }, [selectedItems, busy]);

    useEffect(() => {
        if (isEmpty) {
            setRowIndex(-1);
        }
    }, [isEmpty]);

    useEffect(() => {
        if (!multiple && selectedItems.length > 1) {
            selectAt(rowIndex);
        }
    }, [multiple, rowIndex, selectedItems, selectAt]);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            switch (event.code) {
                case 'Enter':
                    event.stopPropagation();
                    if (!event.repeat) {
                        onEnter?.(selectedItems, event[browser.cmdKey], event.shiftKey);
                    }
                    break;

                case 'Delete':
                    event.stopPropagation();
                    onDelete?.(selectedItems); // let this repeat
                    break;

                case 'KeyI':
                    if (event[browser.cmdKey] && !event.shiftKey && !event.altKey) {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!event.repeat) {
                            onInfo?.(selectedItems);
                        }
                    }
                    break;

                case 'KeyA':
                    if (event[browser.cmdKey] && !event.shiftKey) {
                        event.preventDefault();
                        event.stopPropagation();
                        if (multiple && !event.repeat) {
                            selectAll();
                        }
                    }
                    break;

                case 'ShiftLeft':
                case 'ShiftRight':
                    // TODO: Should this be here?
                    if (!event.repeat) {
                        setRangeSelectionStart(rowIndex);
                    }
                    break;

                case 'Space':
                    if (event[browser.cmdKey]) {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!event.repeat) {
                            toggleSelectionAt(rowIndex); // toggle selected state
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
                            scrollTo(nextIndex);
                            setRowIndex(nextIndex);
                        }
                        if (multiple && event.shiftKey && rangeSelectionStart !== -1) {
                            selectRange(rangeSelectionStart, nextIndex);
                        } else if (!event[browser.cmdKey]) {
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
            onEnter,
            onDelete,
            onInfo,
            scrollTo,
            selectAll,
            selectAt,
            selectRange,
            toggleSelectionAt, // changes often
            selectedItems, // changes often
            multiple,
            rangeSelectionStart,
        ]
    );

    const handleMouseDown = useCallback(
        (event: React.MouseEvent) => {
            const newRowIndex = getRowIndexFromMouseEvent(event);
            if (newRowIndex !== -1) {
                setRowIndex(newRowIndex);
                if (multiple && event.shiftKey) {
                    if (rangeSelectionStart === -1) {
                        selectRange(newRowIndex, rowIndex);
                    } else {
                        selectRange(rangeSelectionStart, newRowIndex);
                    }
                } else if (multiple && event[browser.cmdKey]) {
                    toggleSelectionAt(newRowIndex);
                } else if (!isRowSelectedFromMouseEvent(event)) {
                    selectAt(newRowIndex);
                }
            }
        },
        [selectAt, toggleSelectionAt, selectRange, rowIndex, rangeSelectionStart, multiple]
    );

    const handleMouseUp = useCallback(
        (event: React.MouseEvent) => {
            if (
                event.button === 0 &&
                rowIndex !== -1 &&
                multiple &&
                !event[browser.cmdKey] &&
                !event.shiftKey
            ) {
                selectAt(rowIndex);
            }
        },
        [selectAt, multiple, rowIndex]
    );

    const handleKeyUp = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Shift') {
            setRangeSelectionStart(-1);
        }
    }, []);

    const handleResize = useCallback(({clientWidth, clientHeight}: ScrollableClient) => {
        setClientWidth(clientWidth);
        setClientHeight(clientHeight);
    }, []);

    useOnResize(
        cursorRef,
        ({height}) => {
            if (height > 0) {
                setRowHeight(height);
            }
        },
        'border-box'
    );

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
            if (event.button === -1 || (browser.os !== 'Mac OS' && event.button === 0)) {
                // Not mouse-driven.
                const row = getRowByIndex(containerRef.current!, rowIndex);
                if (row) {
                    const rect = row.getBoundingClientRect();
                    onContextMenu?.(
                        selectedItems,
                        Math.min(rect.left + clientWidth, rect.right),
                        rect.bottom,
                        -1,
                        rowIndex
                    );
                }
            } else {
                const newRowIndex = getRowIndexFromMouseEvent(event);
                if (newRowIndex !== -1) {
                    onContextMenu?.(
                        selectedItems,
                        event.pageX,
                        event.pageY,
                        event.button,
                        newRowIndex
                    );
                }
            }
        },
        [rowIndex, selectedItems, onContextMenu, clientWidth]
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
                '.list-view-body:not(.list-view-drag-image) li.selected'
            )
        );
        items.length = Math.min(items.length, 4);
        for (let i = 0; i < items.length; i++) {
            const item = items[i].cloneNode(true) as HTMLElement;
            item.removeAttribute('id');
            item.removeAttribute('role');
            item.style.transform = `translateY(${rowHeight * i}px)`;
            dragImage.appendChild(item);
        }
    }, [dragItem1, dragItem2, dragItem3, dragItem4, rowHeight]);

    const handleDragStart = useCallback(
        (event: React.DragEvent) => {
            const dataTransfer = event.dataTransfer;
            if (draggable || moveable) {
                dataTransfer.setDragImage(dragImageRef.current!, -16, -16);
                let effectAllowed: DataTransfer['effectAllowed'] = 'none';
                if (draggable && moveable) {
                    effectAllowed = 'copyMove';
                    setDropEffect(event, 'copy');
                } else if (draggable) {
                    effectAllowed = 'copy';
                    setDropEffect(event, 'copy');
                } else {
                    effectAllowed = 'move';
                    setDropEffect(event, 'move');
                }
                globalDrag.setData(event, selectedItems);
                event.dataTransfer.effectAllowed = effectAllowed;
                setDragStartIndex(rowIndex);
            } else {
                dataTransfer.effectAllowed = 'none';
            }
        },
        [draggable, moveable, selectedItems, rowIndex]
    );

    const handleDragOver = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            event.stopPropagation();
            const dataTransfer = event.dataTransfer;
            if (droppable || moveable) {
                const isDropTarget =
                    size === 0 || (event.target as HTMLElement).className === 'scrollable-body';
                const rowIndex = isDropTarget ? size : getRowIndexFromMouseEvent(event);
                if (rowIndex === -1) {
                    setDropEffect(event, 'none');
                    setDragIndex(-1);
                } else if (isDragging) {
                    if (moveable && canDrop(dataTransfer, droppableTypes)) {
                        setDropEffect(event, 'move');
                        setDragIndex(rowIndex);
                    } else {
                        setDropEffect(event, 'none');
                        setDragIndex(-1);
                    }
                } else {
                    if (droppable && canDrop(dataTransfer, droppableTypes)) {
                        setDropEffect(event, 'copy');
                        setDragIndex(rowIndex);
                    } else {
                        setDropEffect(event, 'none');
                        setDragIndex(-1);
                    }
                }
            } else if (isDragging) {
                setDropEffect(event, 'copy');
            } else {
                setDropEffect(event, 'none');
                setDragIndex(-1);
            }
        },
        [size, isDragging, droppable, droppableTypes, moveable]
    );

    const handleDrop = useCallback(
        (event: React.DragEvent) => {
            if (droppable || moveable) {
                let rowIndex = getRowIndexFromMouseEvent(event);
                if (rowIndex === -1) {
                    rowIndex = size;
                }
                const dropEffect = globalDrag.dropEffect;
                if (moveable && dropEffect === 'move') {
                    onMove?.(selectedItems, rowIndex);
                } else if (droppable && dropEffect === 'copy') {
                    const data = getDropData<T>(event, droppableTypes);
                    if (data) {
                        onDrop?.(data, rowIndex);
                    }
                }
            }
            setDragIndex(-1);
            event.preventDefault();
            event.stopPropagation();
        },
        [size, selectedItems, droppable, droppableTypes, moveable, onDrop, onMove]
    );

    const handleDragEnd = useCallback(() => {
        globalDrag.clear();
        setDragStartIndex(-1);
    }, []);

    const handleDragLeave = useCallback((event: React.DragEvent) => {
        const dataTransfer = event.dataTransfer;
        switch (dataTransfer.effectAllowed) {
            case 'copy':
            case 'copyMove':
                setDropEffect(event, 'copy');
                break;

            case 'move':
                setDropEffect(event, 'move');
                break;
        }
        if (
            event.relatedTarget &&
            !containerRef.current!.contains(event.relatedTarget as HTMLElement)
        ) {
            setDragIndex(-1);
        }
    }, []);

    const handleFocus = useCallback(() => {
        if (!multiple && !hasSelection) {
            selectAt(Math.max(rowIndex, 0));
        }
    }, [hasSelection, rowIndex, multiple, selectAt]);

    return (
        <div
            className={`list-view list-view-${layout.view} ${className} ${isThin ? 'thin' : ''} ${
                hasFocus ? 'focus' : ''
            } ${size === 0 ? 'empty' : ''}`}
            tabIndex={disabled ? undefined : isEmpty ? -1 : 0}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            onDoubleClick={handleDoubleClick}
            onDragStart={handleDragStart}
            onDragEnter={handleDragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            ref={containerRef}
        >
            <Scrollable
                scrollWidth={sizeable && !(size === 0 && emptyMessage) ? width : undefined}
                scrollHeight={(size + (showTitles ? 1 : 0)) * rowHeight + dropTargetPadding}
                lineHeight={rowHeight}
                autoscroll={moveable}
                onResize={handleResize}
                onScroll={setScrollPosition}
                ref={scrollableRef}
            >
                {showTitles && (
                    <FixedHeader>
                        <ListViewHead
                            width={width}
                            clientLeft={scrollLeft}
                            clientWidth={clientWidth}
                            reorderable={reorderable}
                            sizeable={sizeable}
                            cols={cols}
                            fontSize={fontSize}
                            onColumnMove={onReorder}
                            onColumnResize={onColumnResize}
                        />
                    </FixedHeader>
                )}
                {size === 0 && emptyMessage ? (
                    <Empty message={emptyMessage} />
                ) : (
                    <ListViewBody
                        title={title}
                        width={sizeable ? width : undefined}
                        pageSize={pageSize}
                        rowHeight={rowHeight}
                        cols={cols}
                        items={items}
                        itemKey={itemKey}
                        itemClassName={itemClassName}
                        listViewId={listViewId}
                        selectedId={selectedId}
                        selectedIds={disabled ? {} : selectedIds}
                        scrollTop={scrollTop}
                        dragIndex={moveable ? dragIndex : -1}
                        draggable={disabled ? false : draggable || moveable}
                        multiple={multiple}
                        busy={isScrolling}
                        view={layout.view}
                    />
                )}
                <div
                    className="list-view-cursor"
                    style={{
                        width: sizeable ? `${width}px` : undefined,
                        transform: `translateY(${Math.max(rowIndex, 0) * rowHeight}px)`,
                    }}
                    ref={cursorRef}
                />
            </Scrollable>
            <ul
                className="list-view-drag-image list-view-body"
                aria-hidden={true}
                ref={dragImageRef}
            />
        </div>
    );
}

function Empty({message}: {message: React.ReactNode}) {
    return (
        <div className="note empty-message">
            {typeof message === 'string' ? <p>{message}</p> : message}
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
    return !!row?.classList.contains('selected');
}

function getRowFromMouseEvent(event: React.MouseEvent): HTMLElement | null {
    return (event.target as HTMLElement).closest('[aria-posinset]');
}

function getRowByIndex(listView: HTMLElement, rowIndex: number): HTMLElement | null {
    return listView.querySelector(`li[aria-posinset="${rowIndex + 1}"]`);
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

function canDrop(dataTransfer: DataTransfer, droppableTypes: readonly string[]): boolean {
    return getDroppableItem(dataTransfer, droppableTypes) !== null;
}

function getDropData<T>(
    event: React.DragEvent,
    droppableTypes: readonly string[]
): readonly T[] | readonly File[] | DataTransferItem | null {
    const dataTransfer = event.dataTransfer;
    const types = dataTransfer.types;
    if (types.includes(globalDrag.type)) {
        return globalDrag.getData(event);
    } else if (types.includes('Files')) {
        return Array.from(dataTransfer.files).filter((item) =>
            droppableTypes.some((type) => compareTypes(type, item.type))
        );
    } else {
        return getDroppableItem(dataTransfer, droppableTypes);
    }
}

function getDroppableItem(
    dataTransfer: DataTransfer,
    droppableTypes: readonly string[]
): DataTransferItem | null {
    const types = [globalDrag.type].concat(droppableTypes);
    const items = Array.from(dataTransfer.items);
    for (const type of types) {
        for (const item of items) {
            if (compareTypes(type, item.type)) {
                return item;
            }
        }
    }
    return null;
}

function setDropEffect(event: React.DragEvent, dropEffect: DataTransfer['dropEffect']): void {
    event.dataTransfer.dropEffect = dropEffect;
    globalDrag.dropEffect = dropEffect;
}

function compareTypes(a: string, b: string): boolean {
    const [typeA, subtypeA] = a.split('/');
    const [typeB, subtypeB] = b.split('/');
    return typeA === typeB && (subtypeA === subtypeB || subtypeA === '*');
}
