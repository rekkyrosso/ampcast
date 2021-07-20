import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {interval} from 'rxjs';
import {partition} from 'utils';
import useOnResize from 'hooks/useOnResize';
import FixedHeader from './FixedHeader';
import Scrollbar, {ScrollbarHandle} from './Scrollbar';
import './Scrollable.scss';

export interface ScrollablePosition {
    left: number;
    top: number;
}

export interface ScrollableClient {
    width: number;
    height: number;
}

export interface ScrollableHandle {
    scrollTo: (position: Partial<ScrollablePosition>) => void;
}

export interface ScrollableProps {
    children?: React.ReactNode;
    scrollWidth?: number;
    scrollHeight?: number;
    scrollAmount?: number;
    droppable?: boolean;
    onResize?: (client: ScrollableClient) => void;
    onScroll?: (position: ScrollablePosition) => void;
    scrollableRef?: React.MutableRefObject<ScrollableHandle | null>;
}

export default function Scrollable({
    children,
    scrollWidth: initialScrollWidth = 0,
    scrollHeight: initialScrollHeight = 0,
    scrollAmount = 10,
    droppable,
    onResize,
    onScroll,
    scrollableRef,
}: ScrollableProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const headRef = useRef<HTMLDivElement>(null);
    const bodyContentRef = useRef<HTMLDivElement>(null);
    const hScrollbarRef = useRef<ScrollbarHandle>(null);
    const vScrollbarRef = useRef<ScrollbarHandle>(null);
    const [hScrollbarSize, setHScrollbarSize] = useState(0);
    const [vScrollbarSize, setVScrollbarSize] = useState(0);
    const [offsetTop, setOffsetTop] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [scrollWidth, setScrollWidth] = useState(initialScrollWidth);
    const [scrollHeight, setScrollHeight] = useState(initialScrollHeight);
    const [innerWidth, setInnerWidth] = useState(0);
    const [innerHeight, setInnerHeight] = useState(0);
    const [overflowX, setOverflowX] = useState(false);
    const [overflowY, setOverflowY] = useState(false);
    const [dragOver, setDragOver] = useState(0);
    const clientWidth = innerWidth - (overflowY ? vScrollbarSize : 0);
    const clientHeight = innerHeight - (overflowX ? hScrollbarSize : 0);

    useEffect(() => {
        if (scrollableRef) {
            scrollableRef.current = {
                scrollTo: ({left, top}) => {
                    if (left !== undefined) {
                        hScrollbarRef.current!.scrollTo(left);
                    }
                    if (top !== undefined) {
                        vScrollbarRef.current!.scrollTo(top);
                    }
                },
            };
        }
    }, [scrollableRef]);

    useLayoutEffect(() => {
        setOverflowX(scrollWidth - clientWidth > 1);
    }, [clientWidth, scrollWidth]);

    useLayoutEffect(() => {
        setOverflowY(scrollHeight - clientHeight > 1);
    }, [clientHeight, scrollHeight]);

    useLayoutEffect(() => {
        containerRef.current!.classList.toggle('overflow-x', overflowX);
    }, [overflowX]);

    useLayoutEffect(() => {
        containerRef.current!.classList.toggle('overflow-y', overflowY);
    }, [overflowY]);

    useLayoutEffect(() => {
        if (initialScrollWidth === 0) {
            setScrollWidth(contentRef.current?.scrollWidth || 0);
        } else {
            setScrollWidth(initialScrollWidth);
        }
    }, [initialScrollWidth]);

    useLayoutEffect(() => {
        if (initialScrollHeight === 0) {
            setScrollHeight(contentRef.current?.scrollHeight || 0);
        } else {
            setScrollHeight(initialScrollHeight);
        }
    }, [initialScrollHeight]);

    const onContainerResize = useCallback(() => {
        const container = containerRef.current!;
        setInnerWidth(container.clientWidth);
        setInnerHeight(container.clientHeight);
        setOffsetTop(container.getBoundingClientRect().top);
    }, []);

    const onContentResize = useCallback(() => {
        const content = contentRef.current!;
        const bodyContent = bodyContentRef.current!;
        if (initialScrollWidth === 0) {
            setScrollWidth(content.scrollWidth);
        }
        if (initialScrollHeight === 0) {
            setScrollHeight(bodyContent.scrollHeight + headRef.current!.clientHeight);
        }
        onResize?.({width: content.clientWidth, height: content.clientHeight});
    }, [initialScrollWidth, initialScrollHeight, onResize]);

    useOnResize(containerRef, onContainerResize);
    useOnResize(contentRef, onContentResize);
    useOnResize(bodyContentRef, onContentResize);

    useLayoutEffect(() => {
        onScroll?.({left: scrollLeft, top: scrollTop});
    }, [scrollLeft, scrollTop, onScroll]);

    const handleWheel = useCallback(
        (event: React.WheelEvent) => {
            vScrollbarRef.current!.scrollBy(3 * scrollAmount * Math.sign(event.deltaY));
        },
        [scrollAmount]
    );

    const handleDragOver = useCallback(
        (event: React.DragEvent) => {
            const clientY = event.nativeEvent.clientY;
            const offsetY = clientY - offsetTop;
            if (offsetY + scrollAmount / 2 > innerHeight) {
                setDragOver(scrollAmount);
            } else if (offsetY < scrollAmount) {
                setDragOver(-scrollAmount);
            }
        },
        [offsetTop, innerHeight, scrollAmount]
    );

    useEffect(() => {
        if (dragOver) {
            const scroll = () => vScrollbarRef.current!.scrollBy(dragOver);
            const interval$ = interval(100);
            const subscription = interval$.subscribe(scroll);
            return () => subscription.unsubscribe();
        }
    }, [dragOver]);

    const cancelDragOver = useCallback(() => setDragOver(0), []);

    const [head, body] = partition(
        React.Children.toArray(children),
        (child) => (child as any)?.type === FixedHeader
    );

    return (
        <div className="scrollable" onWheel={handleWheel} ref={containerRef}>
            <div
                className="scrollable-content"
                onDragOver={droppable ? handleDragOver : undefined}
                onDragLeave={droppable ? cancelDragOver : undefined}
                onDragEnd={droppable ? cancelDragOver : undefined}
                onDrop={droppable ? cancelDragOver : undefined}
                style={{
                    right: overflowY ? `${vScrollbarSize}px` : '0',
                    bottom: overflowX ? `${hScrollbarSize}px` : '0',
                    transform: `translateX(-${scrollLeft}px)`,
                }}
                ref={contentRef}
            >
                <div className="scrollable-head" ref={headRef}>
                    {head}
                </div>
                <div
                    className="scrollable-body"
                    style={{
                        width: initialScrollWidth ? `${initialScrollWidth}px` : undefined,
                    }}
                >
                    <div
                        className="scrollable-body-content"
                        style={{
                            transform: `translateY(-${scrollTop}px)`,
                        }}
                        ref={bodyContentRef}
                    >
                        {body}
                    </div>
                </div>
            </div>
            <Scrollbar
                orientation="horizontal"
                clientSize={clientWidth}
                scrollSize={scrollWidth}
                scrollAmount={scrollAmount}
                onChange={setScrollLeft}
                onResize={setHScrollbarSize}
                scrollbarRef={hScrollbarRef}
            />
            <Scrollbar
                orientation="vertical"
                clientSize={clientHeight}
                scrollSize={scrollHeight}
                scrollAmount={scrollAmount}
                onChange={setScrollTop}
                onResize={setVScrollbarSize}
                scrollbarRef={vScrollbarRef}
            />
        </div>
    );
}
