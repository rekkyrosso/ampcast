import React, {useCallback, useEffect, useState} from 'react';
import {Column} from './ListView';

export interface ColumnResizerProps {
    col: Column<any>;
    onResize: (index: number, width: number) => void;
}

export default function ColumnResizer({col, onResize}: ColumnResizerProps) {
    const [dragStartX, setDragStartX] = useState(-1);
    const [dragWidth, setDragWidth] = useState(0);
    const dragging = dragStartX !== -1;
    const {width, index} = col;

    const handleMouseDown = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault();
            if (event.button === 0) {
                setDragStartX(event.screenX);
                setDragWidth(width);
            }
        },
        [width]
    );

    useEffect(() => onResize(col.index, width), [col.index, width, onResize]);

    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            onResize(index, Math.max(20, dragWidth + (event.screenX - dragStartX)));
        },
        [dragStartX, dragWidth, index, onResize]
    );

    const handleMouseUp = useCallback(() => {
        setDragStartX(-1);
        setDragWidth(0);
    }, []);

    useEffect(() => {
        if (dragging) {
            document.documentElement.style.cursor = 'col-resize';
            document.body.classList.add('dragging');
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('mousemove', handleMouseMove);
            return () => {
                document.documentElement.style.cursor = '';
                document.body.classList.remove('dragging');
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('mousemove', handleMouseMove);
            };
        }
    }, [dragging, handleMouseMove, handleMouseUp]);

    return (
        <span
            className="column-resizer"
            onMouseDown={handleMouseDown}
            style={{
                left: `${col.left + width - 4}px`,
            }}
        />
    );
}
