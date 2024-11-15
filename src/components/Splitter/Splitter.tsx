import React, {Children, useCallback, useEffect, useRef, useState} from 'react';
import {Subscription, fromEvent} from 'rxjs';
import {clamp, preventDefault} from 'utils';
import useOnResize from 'hooks/useOnResize';
import layoutSettings from './layoutSettings';
import './Splitter.scss';
import './layout.scss';

export interface SplitterProps {
    id?: string;
    arrange?: 'rows' | 'columns';
    children: React.ReactNode;
}

export default function Splitter({id = '', arrange = 'columns', children}: SplitterProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState(0);
    const [firstPaneSize, setFirstPaneSize] = useState(() => layoutSettings.get(id));
    const [dragStartPos, setDragStartPos] = useState(-1);
    const [dragStartPaneSize, setDragStartPaneSize] = useState(0);
    const dragging = dragStartPos !== -1;
    const vertical = arrange === 'rows';
    const noFirstPaneSize = !firstPaneSize;

    useEffect(() => {
        if (noFirstPaneSize) {
            const container = containerRef.current!;
            const firstPane = container.querySelector(':scope > .layout-pane-1') as HTMLElement;
            if (firstPane) {
                const flexBasis = parseFloat(getComputedStyle(firstPane).flexBasis) || 0;
                setFirstPaneSize(flexBasis / 100);
            }
        }
    }, [noFirstPaneSize]);

    const handleMouseDown = useCallback(
        (event: React.MouseEvent) => {
            if (event.button === 0) {
                const dragStartPos = vertical ? event.screenY : event.screenX;
                const firstPaneSize = getFirstPaneSize(containerRef.current!, vertical);
                setDragStartPos(dragStartPos);
                setDragStartPaneSize(firstPaneSize);
                event.preventDefault();
            }
        },
        [vertical]
    );

    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            const dragEndPos = vertical ? event.screenY : event.screenX;
            const dragDistance = dragEndPos - dragStartPos;
            const size = clamp(0.0001, dragStartPaneSize + dragDistance / containerSize, 1);
            setFirstPaneSize(size);
        },
        [vertical, dragStartPos, dragStartPaneSize, containerSize]
    );

    const endDrag = useCallback(() => {
        const firstPaneSize = getFirstPaneSize(containerRef.current!, vertical);
        layoutSettings.set(id, firstPaneSize);
        setDragStartPos(-1);
        setDragStartPaneSize(0);
    }, [id, vertical]);

    useEffect(() => {
        if (dragging) {
            const {documentElement: html, body} = document;
            html.style.cursor = vertical ? 'ns-resize' : 'ew-resize';
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
    }, [vertical, dragging, handleMouseMove, endDrag]);

    useOnResize(containerRef, ({width, height}) => {
        setContainerSize(vertical ? height : width);
    });

    return (
        <div className={`splitter splitter-${arrange}`} id={id} ref={containerRef}>
            {Children.toArray(children)
                .slice(0, 2)
                .map((pane, index) => {
                    const nodes = [];
                    if (index === 1) {
                        nodes.push(
                            <div
                                className={`layout-splitter ${dragging ? 'active' : ''}`}
                                role="separator"
                                onMouseDown={handleMouseDown}
                                key="splitter"
                            />
                        );
                    }
                    nodes.push(
                        <div
                            className={`layout-pane layout-pane-${index + 1}`}
                            style={
                                index === 0 && firstPaneSize
                                    ? {flexBasis: `${firstPaneSize * 100}%`}
                                    : undefined
                            }
                            key={index}
                        >
                            {pane}
                        </div>
                    );
                    return nodes;
                })
                .flat()}
        </div>
    );
}

function getFirstPaneSize(layout: HTMLElement, vertical: boolean): number {
    const firstPane = layout.querySelector(':scope > .layout-pane-1') as HTMLElement;
    if (firstPane) {
        return vertical
            ? firstPane.clientHeight / layout.clientHeight
            : firstPane.clientWidth / layout.clientWidth;
    }
    return 0;
}
