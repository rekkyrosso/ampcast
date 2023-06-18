import React, {Children, useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import layoutSettings from 'services/layoutSettings';
import useFontSize from 'hooks/useFontSize';
import useOnResize from 'hooks/useOnResize';
import LayoutPane from './LayoutPane';
import './Splitter.scss';

export interface SplitterProps {
    id?: string;
    arrange?: 'rows' | 'columns';
    primaryIndex?: number;
    children: React.ReactNode;
}

interface Rect {
    width: number;
    height: number;
}

export default function Splitter({
    id,
    arrange = 'columns',
    primaryIndex = 0,
    children,
}: SplitterProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerRect, setContainerRect] = useState<Rect>({width: 0, height: 0});
    const [primaryMinSize, setPrimaryMinSize] = useState(0);
    const [secondaryMinSize, setSecondaryMinSize] = useState(0);
    const [splitterSize, setSplitterSize] = useState(0);
    const [secondaryPaneSize, setSecondaryPaneSize] = useState(() =>
        id ? layoutSettings.get(id) : 0
    );
    const [dragStartPos, setDragStartPos] = useState(-1);
    const [dragStartSize, setDragStartSize] = useState(0);
    const dragging = dragStartPos !== -1;
    const fontSize = useFontSize();
    const vertical = arrange === 'rows';

    useEffect(() => {
        if (id) {
            layoutSettings.set(id, secondaryPaneSize);
        }
    }, [id, secondaryPaneSize]);

    useEffect(() => {
        if (fontSize > 0) {
            const container = containerRef.current!;
            const minSize: keyof CSSStyleDeclaration = vertical ? 'minHeight' : 'minWidth';
            const primaryPane = container.querySelector(
                ':scope > .layout-pane-primary'
            ) as HTMLElement;
            if (primaryPane) {
                primaryPane.style[minSize] = '';
                const primaryMinSize = parseInt(getComputedStyle(primaryPane)[minSize], 10);
                primaryPane.style[minSize] = 'unset';
                setPrimaryMinSize(primaryMinSize || 80);
            }
            const secondaryPane = container.querySelector(
                ':scope > .layout-pane-secondary'
            ) as HTMLElement;
            if (secondaryPane) {
                secondaryPane.style[minSize] = '';
                const secondaryMinSize = parseInt(getComputedStyle(secondaryPane)[minSize], 10);
                secondaryPane.style[minSize] = 'unset';
                setSecondaryMinSize(secondaryMinSize || 80);
                const clientSize: keyof HTMLElement = vertical ? 'offsetHeight' : 'offsetWidth';
                const splitter = container.querySelector(
                    ':scope > .layout-splitter'
                ) as HTMLElement;
                setSplitterSize(splitter?.[clientSize] ?? 4);
            }
        }
    }, [vertical, fontSize]);

    // This effect clamps `secondaryPaneSize`.
    useLayoutEffect(() => {
        const containerSize = vertical ? containerRect.height : containerRect.width;
        if (containerSize > 0) {
            const primaryPaneSize = containerSize - splitterSize - secondaryPaneSize;
            if (primaryPaneSize < primaryMinSize) {
                setSecondaryPaneSize(
                    Math.max(secondaryPaneSize - (primaryMinSize - primaryPaneSize), 0)
                );
            } else if (secondaryPaneSize < secondaryMinSize) {
                setSecondaryPaneSize(
                    Math.min(containerSize - splitterSize - primaryMinSize, secondaryMinSize)
                );
            }
        }
    }, [
        vertical,
        containerRect,
        primaryMinSize,
        secondaryMinSize,
        splitterSize,
        secondaryPaneSize,
    ]);

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
        [vertical, primaryIndex, dragStartPos, dragStartSize]
    );

    const handleMouseUp = useCallback(() => {
        setDragStartPos(-1);
        setDragStartSize(0);
    }, []);

    useEffect(() => {
        if (dragging) {
            document.documentElement.style.cursor = vertical ? 'ns-resize' : 'ew-resize';
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
    }, [vertical, dragging, handleMouseMove, handleMouseUp]);

    useOnResize(containerRef, () => {
        const container = containerRef.current!;
        setContainerRect({
            width: container.clientWidth,
            height: container.clientHeight,
        });
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
