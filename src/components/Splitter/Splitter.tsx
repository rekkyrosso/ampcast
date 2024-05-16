import React, {Children, useCallback, useEffect, useRef, useState} from 'react';
import {Subscription, fromEvent} from 'rxjs';
import useBaseFontSize from 'hooks/useBaseFontSize';
import useOnResize from 'hooks/useOnResize';
import {preventDefault} from 'utils';
import LayoutPane from './LayoutPane';
import useSplitterState from './useSplitterState';
import './Splitter.scss';

export interface SplitterProps {
    id?: string;
    arrange?: 'rows' | 'columns';
    primaryIndex?: number;
    children: React.ReactNode;
}

export default function Splitter({
    id,
    arrange = 'columns',
    primaryIndex = 0,
    children,
}: SplitterProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const {secondaryPaneSize, setContainerSize, setSecondaryPaneSize, setMinSizes} =
        useSplitterState(id);
    const [dragStartPos, setDragStartPos] = useState(-1);
    const [dragStartSize, setDragStartSize] = useState(0);
    const dragging = dragStartPos !== -1;
    const fontSize = useBaseFontSize();
    const vertical = arrange === 'rows';

    useEffect(() => {
        if (fontSize > 0) {
            let primaryMinSize = 0;
            let secondaryMinSize = 0;
            let splitterSize = 0;
            const container = containerRef.current!;
            const minSize: keyof CSSStyleDeclaration = vertical ? 'minHeight' : 'minWidth';
            const primaryPane = container.querySelector(
                ':scope > .layout-pane-primary'
            ) as HTMLElement;
            if (primaryPane) {
                primaryMinSize = parseInt(getComputedStyle(primaryPane)[minSize], 10) || 0;
            }
            const secondaryPane = container.querySelector(
                ':scope > .layout-pane-secondary'
            ) as HTMLElement;
            if (secondaryPane) {
                secondaryPane.style[minSize] = '';
                secondaryMinSize = parseInt(getComputedStyle(secondaryPane)[minSize], 10) || 0;
                secondaryPane.style[minSize] = 'unset';
                const clientSize: keyof HTMLElement = vertical ? 'offsetHeight' : 'offsetWidth';
                const splitter = container.querySelector(
                    ':scope > .layout-splitter'
                ) as HTMLElement;
                splitterSize = splitter?.[clientSize] ?? 4;
            }
            setMinSizes(primaryMinSize, secondaryMinSize, splitterSize);
        }
    }, [vertical, fontSize, setMinSizes]);

    const handleMouseDown = useCallback(
        (event: React.MouseEvent) => {
            if (event.button === 0) {
                const dragStartPos = vertical ? event.screenY : event.screenX;
                setDragStartPos(dragStartPos);
                setDragStartSize(secondaryPaneSize);
                event.preventDefault();
            }
        },
        [vertical, secondaryPaneSize]
    );

    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            const dragEndPos = vertical ? event.screenY : event.screenX;
            const dragDistance = dragEndPos - dragStartPos;
            const size =
                primaryIndex === 0 ? dragStartSize - dragDistance : dragStartSize + dragDistance;
            setSecondaryPaneSize(size);
        },
        [vertical, primaryIndex, dragStartPos, dragStartSize, setSecondaryPaneSize]
    );

    const endDrag = useCallback(() => {
        setDragStartPos(-1);
        setDragStartSize(0);
    }, []);

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
                .map((child, index) => {
                    const primary = index === primaryIndex;
                    const size = primary ? 0 : secondaryPaneSize;
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
                        <LayoutPane vertical={vertical} primary={primary} size={size} key={index}>
                            {child}
                        </LayoutPane>
                    );
                    return nodes;
                })}
        </div>
    );
}
