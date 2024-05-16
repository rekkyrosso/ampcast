import React, {useCallback, useEffect, useId, useRef, useState} from 'react';
import {interval} from 'rxjs';
import {partition} from 'utils';
import useOnResize, {ResizeRect} from 'hooks/useOnResize';
import FixedHeader from './FixedHeader';
import Scrollbar, {ScrollbarHandle} from './Scrollbar';
import './Scrollable.scss';

export interface ScrollablePosition {
    readonly left: number;
    readonly top: number;
}

export interface ScrollableClient {
    readonly clientWidth: number;
    readonly clientHeight: number;
    readonly scrollWidth: number;
    readonly scrollHeight: number;
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
    const scrollableId = useId();
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const headRef = useRef<HTMLDivElement>(null);
    const bodyContentRef = useRef<HTMLDivElement>(null);
    const hScrollbarRef = useRef<ScrollbarHandle>(null);
    const vScrollbarRef = useRef<ScrollbarHandle>(null);
    const noInitialScrollWidth = initialScrollWidth === 0;
    const noInitialScrollHeight = initialScrollHeight === 0;
    const [hScrollbarSize, setHScrollbarSize] = useState(0);
    const [vScrollbarSize, setVScrollbarSize] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [scrollRect, setScrollRect] = useState<ResizeRect>(() => ({
        width: initialScrollWidth,
        height: initialScrollHeight,
    }));
    const scrollWidth = scrollRect.width;
    const scrollHeight = scrollRect.height;
    const [innerRect, setInnerRect] = useState<ResizeRect>(() => ({width: 0, height: 0}));
    const innerWidth = innerRect.width;
    const innerHeight = innerRect.height;
    const [overflowX, setOverflowX] = useState(false);
    const [overflowY, setOverflowY] = useState(false);
    const [dragOver, setDragOver] = useState(0);
    const clientWidth = Math.max(innerWidth - (overflowY ? vScrollbarSize : 0), 0);
    const clientHeight = Math.max(innerHeight - (overflowX ? hScrollbarSize : 0), 0);

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

    useEffect(() => {
        if (scrollWidth && clientWidth) {
            setOverflowX(scrollWidth - clientWidth > 1);
        } else {
            setOverflowX(false);
        }
    }, [scrollWidth, clientWidth]);

    useEffect(() => {
        if (scrollHeight && clientHeight) {
            setOverflowY(scrollHeight - clientHeight > 1);
        } else {
            setOverflowY(false);
        }
    }, [scrollHeight, clientHeight]);

    useEffect(() => {
        const width = initialScrollWidth || contentRef.current?.scrollWidth || 0;
        const height = initialScrollHeight || contentRef.current?.scrollHeight || 0;
        setScrollRect({width, height});
    }, [initialScrollWidth, initialScrollHeight]);

    useEffect(() => {
        onResize?.({clientWidth, clientHeight, scrollWidth, scrollHeight});
    }, [clientWidth, clientHeight, scrollWidth, scrollHeight, onResize]);

    const onContentResize = useCallback(() => {
        setScrollRect((scrollRect) => {
            const content = contentRef.current!;
            const bodyContent = bodyContentRef.current!;
            const width = noInitialScrollWidth ? content.scrollWidth : scrollRect.width;
            const height = noInitialScrollHeight
                ? bodyContent.scrollHeight + (headRef.current?.clientHeight || 0)
                : scrollRect.height;
            return {width, height};
        });
    }, [noInitialScrollWidth, noInitialScrollHeight]);

    useOnResize(containerRef, setInnerRect);
    useOnResize(contentRef, onContentResize);
    useOnResize(bodyContentRef, onContentResize);

    useEffect(() => {
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
            const offsetTop = containerRef.current!.getBoundingClientRect().top;
            const offsetY = clientY - offsetTop;
            if (offsetY + scrollAmount / 2 > innerHeight) {
                setDragOver(scrollAmount);
            } else if (offsetY < scrollAmount) {
                setDragOver(-scrollAmount);
            }
        },
        [innerHeight, scrollAmount]
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
        <div
            className={`scrollable ${overflowX ? 'overflow-x' : ''} ${
                overflowY ? 'overflow-y' : ''
            }`}
            id={scrollableId}
            onWheel={handleWheel}
            ref={containerRef}
        >
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
                {head?.length ? (
                    <div className="scrollable-head" ref={headRef}>
                        {head}
                    </div>
                ) : null}
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
                scrollableId={scrollableId}
                orientation="horizontal"
                clientSize={clientWidth}
                scrollSize={scrollWidth}
                scrollAmount={scrollAmount}
                onChange={setScrollLeft}
                onResize={setHScrollbarSize}
                scrollbarRef={hScrollbarRef}
            />
            <Scrollbar
                scrollableId={scrollableId}
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
