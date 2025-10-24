import React, {useCallback, useEffect, useId, useImperativeHandle, useRef, useState} from 'react';
import {interval} from 'rxjs';
import {browser, partition} from 'utils';
import useBaseFontSize from 'hooks/useBaseFontSize';
import useOnResize, {ResizeRect} from 'hooks/useOnResize';
import usePrevious from 'hooks/usePrevious';
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
    lineHeight?: number;
    scrollAmountX?: number;
    scrollAmountY?: number;
    droppable?: boolean;
    onResize?: (client: ScrollableClient) => void;
    onScroll?: (position: ScrollablePosition) => void;
    ref?: React.RefObject<ScrollableHandle | null>;
}

export default function Scrollable({
    children,
    scrollWidth: initialScrollWidth = 0,
    scrollHeight: initialScrollHeight = 0,
    droppable,
    onResize,
    onScroll,
    ref,
    ...props
}: ScrollableProps) {
    const scrollableId = useId();
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const headRef = useRef<HTMLDivElement>(null);
    const bodyContentRef = useRef<HTMLDivElement>(null);
    const hScrollbarRef = useRef<ScrollbarHandle>(null);
    const vScrollbarRef = useRef<ScrollbarHandle>(null);
    const baseFontSize = useBaseFontSize();
    const {
        lineHeight = baseFontSize,
        scrollAmountY = lineHeight,
        scrollAmountX = scrollAmountY,
    } = props;
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
    const prevLineHeight = usePrevious(lineHeight);

    useImperativeHandle(ref, () => ({
        scrollTo: ({left, top}) => {
            if (left !== undefined) {
                hScrollbarRef.current!.scrollTo(left);
            }
            if (top !== undefined) {
                vScrollbarRef.current!.scrollTo(top);
            }
        },
    }));

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

    useEffect(() => {
        // Restore scroll position after `lineHeight` change.
        if (prevLineHeight && prevLineHeight !== lineHeight) {
            vScrollbarRef.current?.scrollTo(scrollTop * (lineHeight / prevLineHeight));
        }
    }, [lineHeight, prevLineHeight, scrollTop]);

    const onContainerResize = useCallback((rect: ResizeRect) => {
        if (rect.width * rect.height > 0) {
            setInnerRect(rect);
        }
    }, []);

    const onContentResize = useCallback(() => {
        setScrollRect((scrollRect) => {
            const width = noInitialScrollWidth ? contentRef.current!.scrollWidth : scrollRect.width;
            return width > 0 ? {width, height: scrollRect.height} : scrollRect;
        });
    }, [noInitialScrollWidth]);

    const onBodyContentResize = useCallback(() => {
        setScrollRect((scrollRect) => {
            const height = noInitialScrollHeight
                ? bodyContentRef.current!.scrollHeight + (headRef.current?.clientHeight || 0)
                : scrollRect.height;
            return height > 0 ? {width: scrollRect.width, height} : scrollRect;
        });
    }, [noInitialScrollHeight]);

    useOnResize(containerRef, onContainerResize);
    useOnResize(contentRef, onContentResize);
    useOnResize(bodyContentRef, onBodyContentResize);

    useEffect(() => {
        onScroll?.({left: scrollLeft, top: scrollTop});
    }, [scrollLeft, scrollTop, onScroll]);

    useEffect(() => {
        const container = containerRef.current;
        const handleWheel = (event: WheelEvent) => {
            if (!event[browser.cmdKey]) {
                event.preventDefault();
                const hScrollbar = hScrollbarRef.current!;
                const vScrollbar = vScrollbarRef.current!;
                if (!hScrollbar.atStart() && event.deltaX < 0) {
                    event.stopPropagation();
                    hScrollbar.scrollBy(event.deltaX);
                } else if (!hScrollbar.atEnd() && event.deltaX > 0) {
                    event.stopPropagation();
                    hScrollbar.scrollBy(event.deltaX);
                }
                if (!vScrollbar.atStart() && event.deltaY < 0) {
                    event.stopPropagation();
                    vScrollbar.scrollBy(event.deltaY);
                } else if (!vScrollbar.atEnd() && event.deltaY > 0) {
                    event.stopPropagation();
                    vScrollbar.scrollBy(event.deltaY);
                }
            }
        };
        container?.addEventListener('wheel', handleWheel, {passive: false});
        return () => container?.removeEventListener('wheel', handleWheel);
    }, []);

    const handleDragOver = useCallback(
        (event: React.DragEvent) => {
            const offsetTop = containerRef.current!.getBoundingClientRect().top;
            const offsetY = event.clientY - offsetTop;
            if (offsetY + 2 * lineHeight > innerHeight) {
                setDragOver(lineHeight);
            } else if (offsetY < (overflowX ? 2 : 1) * lineHeight) {
                setDragOver(-lineHeight);
            }
        },
        [innerHeight, lineHeight, overflowX]
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
                scrollAmount={scrollAmountX}
                onChange={setScrollLeft}
                onResize={setHScrollbarSize}
                ref={hScrollbarRef}
            />
            <Scrollbar
                scrollableId={scrollableId}
                orientation="vertical"
                clientSize={clientHeight}
                scrollSize={scrollHeight}
                scrollAmount={scrollAmountY}
                onChange={setScrollTop}
                onResize={setVScrollbarSize}
                ref={vScrollbarRef}
            />
        </div>
    );
}
