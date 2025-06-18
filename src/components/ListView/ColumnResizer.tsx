import React, {useCallback, useEffect, useState} from 'react';
import {Subscription, fromEvent} from 'rxjs';
import {preventDefault} from 'utils';
import {Column} from './ListView';

export interface ColumnResizerProps<T> {
    col: Column<T>;
    fontSize: number;
    onResize: (col: Column<any>, width: number) => void;
}

export default function ColumnResizer<T>({col, fontSize, onResize}: ColumnResizerProps<T>) {
    const [dragStartX, setDragStartX] = useState(-1);
    const [dragWidth, setDragWidth] = useState(0);
    const dragging = dragStartX !== -1;
    const {left, width} = col;
    const leftPx = left * fontSize;
    const widthPx = width * fontSize;

    const handleMouseDown = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault();
            if (event.button === 0) {
                setDragStartX(event.screenX);
                setDragWidth(widthPx);
            }
        },
        [widthPx]
    );

    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            onResize(col, Math.max(20, dragWidth + (event.screenX - dragStartX)));
        },
        [col, dragStartX, dragWidth, onResize]
    );

    const endDrag = useCallback(() => {
        setDragStartX(-1);
        setDragWidth(0);
    }, []);

    useEffect(() => {
        if (dragging) {
            const body = document.body;
            const subscription = new Subscription();
            const fromMouseEvent = (type: string) => fromEvent<MouseEvent>(document, type);
            subscription.add(fromMouseEvent('mouseup').subscribe(endDrag));
            subscription.add(fromMouseEvent('mousemove').subscribe(handleMouseMove));
            subscription.add(fromEvent(document, 'selectstart').subscribe(preventDefault));
            subscription.add(fromEvent(window, 'blur').subscribe(endDrag));
            body.style.cursor = 'col-resize';
            body.classList.add('dragging');
            return () => {
                body.classList.remove('dragging');
                body.style.cursor = '';
                subscription.unsubscribe();
            };
        }
    }, [dragging, handleMouseMove, endDrag]);

    return (
        <span
            className="column-resizer"
            onMouseDown={handleMouseDown}
            style={{
                left: `${leftPx + widthPx}px`,
            }}
        />
    );
}
