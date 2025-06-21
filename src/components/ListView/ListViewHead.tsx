import React, {useCallback, useEffect, useRef, useState} from 'react';
import {animationFrameScheduler, timer} from 'rxjs';
import {clamp} from 'utils';
import {Column} from './ListView';
import ListViewHeadCell from './ListViewHeadCell';
import ColumnDropMarker from './ColumnDropMarker';
import ColumnResizer from './ColumnResizer';

export interface ListViewHeadProps<T> {
    width: number;
    clientLeft: number;
    clientWidth: number;
    cols: readonly Column<T>[];
    fontSize: number;
    reorderable?: boolean;
    sizeable?: boolean;
    onColumnMove?: (col: Column<T>, toIndex: number) => void;
    onColumnResize: (col: Column<T>, width: number) => void;
}

export default function ListViewHead<T>({
    width,
    clientLeft,
    clientWidth,
    cols,
    fontSize,
    reorderable,
    sizeable,
    onColumnMove,
    onColumnResize,
}: ListViewHeadProps<T>) {
    const ref = useRef<HTMLHeadingElement>(null);
    const [dragIndex, setDragIndex] = useState(-1);
    const [dragOverIndex, setDragOverIndex] = useState(-1);
    const [scrollAmount, setScrollAmount] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const dragging = dragIndex !== -1;
    const dragCol = cols[dragIndex];
    const dragOverCol = cols[dragOverIndex];
    const minScrollLeft = clientWidth + clientLeft - width;
    const maxScrollLeft = clientLeft;

    useEffect(() => {
        if (scrollAmount) {
            const subscription = timer(0, 100, animationFrameScheduler).subscribe(() =>
                setScrollLeft((scrollLeft) =>
                    clamp(minScrollLeft, scrollLeft + scrollAmount, maxScrollLeft)
                )
            );
            return () => subscription.unsubscribe();
        }
    }, [scrollAmount, minScrollLeft, maxScrollLeft]);

    const handleDragStart = useCallback(
        (event: React.DragEvent) => {
            event.stopPropagation();
            const index = getCellIndexFromMouseEvent(event, false);
            if (index !== -1) {
                const dragImage = getCellFromMouseEvent(event);
                const dataTransfer = event.dataTransfer;
                dataTransfer.effectAllowed = 'move';
                dataTransfer.dropEffect = 'move';
                dataTransfer.setDragImage(dragImage!, 0, -fontSize);
                setDragIndex(index);
            }
        },
        [fontSize]
    );

    const handleDragOver = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            event.stopPropagation();
            if (dragging) {
                event.dataTransfer.dropEffect = 'move';
                const rect = ref.current!.getBoundingClientRect();
                const scrollBoundary = fontSize * 4;
                if (event.clientX - clientLeft - rect.left < scrollBoundary) {
                    setScrollAmount(fontSize);
                } else if (event.clientX - clientLeft > rect.right - scrollBoundary) {
                    setScrollAmount(-fontSize);
                } else {
                    setScrollAmount(0);
                }
                const index = getCellIndexFromMouseEvent(event, true);
                if (index !== -1) {
                    setDragOverIndex(index);
                }
            }
        },
        [dragging, clientLeft, fontSize]
    );

    const handleDragLeave = useCallback(
        (event: React.DragEvent) => {
            event.stopPropagation();
            if (dragging) {
                event.dataTransfer.dropEffect = 'move';
            }
        },
        [dragging]
    );

    const handleDragEnd = useCallback((event: React.DragEvent) => {
        event.stopPropagation();
        setDragOverIndex(-1);
        setDragIndex(-1);
        setScrollAmount(0);
        setScrollLeft(0);
    }, []);

    const handleDrop = useCallback(
        (event: React.DragEvent) => {
            event.stopPropagation();
            onColumnMove?.(dragCol, dragOverIndex);
            setDragOverIndex(-1);
            setDragIndex(-1);
            setScrollAmount(0);
            setScrollLeft(0);
        },
        [onColumnMove, dragCol, dragOverIndex]
    );

    return (
        <header
            className="list-view-head"
            onDragStart={reorderable ? handleDragStart : undefined}
            onDragEnter={reorderable ? handleDragOver : undefined}
            onDragOver={reorderable ? handleDragOver : undefined}
            onDragLeave={reorderable ? handleDragLeave : undefined}
            onDragEnd={reorderable ? handleDragEnd : undefined}
            onDrop={reorderable ? handleDrop : undefined}
            ref={ref}
        >
            {fontSize ? (
                <div
                    className={`list-view-row ${dragging ? 'dragging' : ''}`}
                    style={{
                        width: `${width}px`,
                        transform: `translateX(${scrollLeft}px)`,
                    }}
                >
                    {dragOverCol ? (
                        <ColumnDropMarker
                            col={dragOverCol}
                            fontSize={fontSize}
                            key={dragOverCol.id}
                        />
                    ) : null}
                    {cols.map((col, index) => (
                        <ListViewHeadCell
                            {...col}
                            draggable={reorderable}
                            insertBefore={index === dragOverIndex}
                            key={col.id}
                        />
                    ))}{' '}
                    {sizeable &&
                        cols.map((col) => (
                            <ColumnResizer
                                col={col}
                                fontSize={fontSize}
                                onResize={onColumnResize}
                                key={col.id}
                            />
                        ))}
                </div>
            ) : null}
        </header>
    );
}

function getCellIndexFromMouseEvent(event: React.MouseEvent, closest: boolean): number {
    let cellIndex = -1;
    const cell = getCellFromMouseEvent(event);
    if (cell) {
        cellIndex = Number(cell.dataset.index) || 0;
        if (closest && cell.matches(':has(+ .list-view-cell)')) {
            const rect = cell.getBoundingClientRect();
            const left = event.clientX - rect.left;
            if (left > rect.width / 2) {
                cellIndex++;
            }
        }
    }
    return cellIndex;
}

function getCellFromMouseEvent(event: React.MouseEvent): HTMLElement | null {
    return (event.target as HTMLElement).closest('.list-view-cell');
}
