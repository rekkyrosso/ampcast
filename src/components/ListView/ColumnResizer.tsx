import React, {useCallback, useEffect, useState} from 'react';
import {Subscription, fromEvent} from 'rxjs';
import {preventDefault} from 'utils';
import {Column} from './ListView';

export interface ColumnResizerProps {
    col: Column<any>;
    fontSize: number;
    onResize: (index: number, width: number) => void;
}

export default function ColumnResizer({col, fontSize, onResize}: ColumnResizerProps) {
    const [dragStartX, setDragStartX] = useState(-1);
    const [dragWidth, setDragWidth] = useState(0);
    const dragging = dragStartX !== -1;
    const {index, left, width} = col;
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
            onResize(index, Math.max(20, dragWidth + (event.screenX - dragStartX)));
        },
        [dragStartX, dragWidth, index, onResize]
    );

    const endDrag = useCallback(() => {
        setDragStartX(-1);
        setDragWidth(0);
    }, []);

    useEffect(() => {
        if (dragging) {
            const {documentElement: html, body} = document;
            html.style.cursor = 'col-resize';
            body.classList.add('dragging');
            const subscription = new Subscription();
            const fromMouseEvent = (type: string) => fromEvent<MouseEvent>(document, type);
            subscription.add(fromMouseEvent('mouseup').subscribe(endDrag));
            subscription.add(fromMouseEvent('mousemove').subscribe(handleMouseMove));
            subscription.add(fromEvent(document, 'selectstart').subscribe(preventDefault));
            subscription.add(fromEvent(window, 'blur').subscribe(endDrag));
            return () => {
                html.style.cursor = '';
                body.classList.remove('dragging');
                subscription.unsubscribe();
            };
        }
    }, [dragging, handleMouseMove, endDrag]);

    return (
        <span
            className="column-resizer"
            onMouseDown={handleMouseDown}
            style={{
                left: `${leftPx + widthPx - 4}px`,
            }}
        />
    );
}
