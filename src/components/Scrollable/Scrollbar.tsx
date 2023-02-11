import React, {memo, useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {EMPTY, fromEvent, merge, timer} from 'rxjs';
import {filter, map, startWith, switchMap, takeUntil} from 'rxjs/operators';
import {cancelEvent} from 'utils';
import useOnResize from 'hooks/useOnResize';
import useScrollbarState from './useScrollbarState';
import './Scrollbar.scss';

export interface ScrollbarHandle {
    scrollBy: (amount: number) => void;
    scrollTo: (position: number) => void;
}

export interface ScrollbarProps {
    orientation: 'horizontal' | 'vertical';
    clientSize: number;
    scrollSize: number;
    scrollAmount: number;
    onChange?: (value: number) => void;
    onResize?: (size: number) => void;
    scrollbarRef: React.MutableRefObject<ScrollbarHandle | null>;
}

function Scrollbar({
    orientation,
    scrollAmount,
    onChange,
    onResize,
    scrollbarRef,
    ...props
}: ScrollbarProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const {position, max, clientSize, scrollSize, resize, scrollBy, scrollTo} = useScrollbarState();
    const [size, setSize] = useState(0);
    const [trackSize, setTrackSize] = useState(0);
    const [thumbSize, setThumbSize] = useState(0);
    const [dragStart, setDragStart] = useState(-1);
    const [dragThumbPosition, setDragThumbPosition] = useState(0);
    const dragging = dragStart !== -1;
    const vertical = orientation === 'vertical';
    const thumbPosition = Math.ceil((trackSize - thumbSize) * (position / max));

    useEffect(() => {
        scrollbarRef.current = {scrollBy, scrollTo};
    }, [scrollbarRef, scrollBy, scrollTo]);

    useLayoutEffect(
        () => resize(props.clientSize, props.scrollSize),
        [props.clientSize, props.scrollSize, resize]
    );
    useLayoutEffect(() => onChange?.(position), [position, onChange]);
    useLayoutEffect(() => onResize?.(size), [size, onResize]);

    useOnResize(trackRef, () => {
        const rect = trackRef.current!.getBoundingClientRect();
        setTrackSize(vertical ? rect.height : rect.width);
        setSize(vertical ? rect.width : rect.height);
    });

    useOnResize(thumbRef, () => {
        const rect = thumbRef.current!.getBoundingClientRect();
        setThumbSize(vertical ? rect.height : rect.width);
    });

    const startScroll = useCallback(
        (target: HTMLElement, scrollBy: number) => {
            const repeatDelay = 400;
            const repeatInterval = 40;
            const scroll = () => scrollbarRef.current!.scrollBy(scrollBy);
            const isTarget = (event: Event) => event.target === target;
            const mouseUp$ = fromEvent(document, 'mouseup');
            const mouseOver$ = fromEvent(target, 'mouseover').pipe(map(isTarget), startWith(true));
            const mouseOut$ = fromEvent(target, 'mouseout').pipe(
                filter(isTarget),
                map(() => false)
            );
            const hover$ = merge(mouseOver$, mouseOut$);
            const subscription = hover$
                .pipe(
                    switchMap((hover, index) =>
                        hover ? timer(index === 0 ? repeatDelay : 0, repeatInterval) : EMPTY
                    ),
                    takeUntil(mouseUp$)
                )
                .subscribe(scroll);
            scroll();
            return () => subscription.unsubscribe();
        },
        [scrollbarRef]
    );

    const handleDecrementMouseDown = useCallback(
        (event: React.MouseEvent) => {
            if (event.button === 0) {
                return startScroll(event.target as HTMLElement, -scrollAmount);
            }
        },
        [scrollAmount, startScroll]
    );

    const handleIncrementMouseDown = useCallback(
        (event: React.MouseEvent) => {
            if (event.button === 0) {
                return startScroll(event.target as HTMLElement, scrollAmount);
            }
        },
        [scrollAmount, startScroll]
    );

    const handleTrackMouseDown = useCallback(
        (event: React.MouseEvent) => {
            if (event.button === 0) {
                const position = vertical ? event.nativeEvent.offsetY : event.nativeEvent.offsetX;
                return startScroll(
                    event.target as HTMLElement,
                    position < thumbPosition ? -clientSize : clientSize
                );
            }
        },
        [vertical, clientSize, thumbPosition, startScroll]
    );

    const handleThumbMouseDown = useCallback(
        (event: React.MouseEvent) => {
            event.stopPropagation();
            if (event.button === 0) {
                setDragStart(vertical ? event.screenY : event.screenX);
                setDragThumbPosition(thumbPosition);
            }
        },
        [vertical, thumbPosition]
    );

    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            const dragPos = vertical ? event.screenY : event.screenX;
            const thumbPosition = dragThumbPosition + (dragPos - dragStart);
            scrollTo((thumbPosition * max) / (trackSize - thumbSize));
        },
        [vertical, dragStart, dragThumbPosition, max, thumbSize, trackSize, scrollTo]
    );

    const handleMouseUp = useCallback(() => {
        setDragStart(-1);
        setDragThumbPosition(0);
    }, []);

    useEffect(() => {
        if (dragging) {
            document.body.classList.add('dragging');
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('mousemove', handleMouseMove);
            return () => {
                document.body.classList.remove('dragging');
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('mousemove', handleMouseMove);
            };
        }
    }, [dragging, handleMouseMove, handleMouseUp]);

    return (
        <div
            className={`scrollbar scrollbar-${orientation}`}
            onContextMenu={cancelEvent}
            onMouseDown={cancelEvent}
        >
            <div
                className="scrollbar-button scrollbar-button-decrement"
                onMouseDown={handleDecrementMouseDown}
            >
                <svg className="icon" viewBox="0 0 50 50">
                    <polygon points={vertical ? '0,50 25,0 50,50' : '50,0 0,25 50,50'} />
                </svg>
            </div>
            <div className="scrollbar-track" onMouseDown={handleTrackMouseDown} ref={trackRef}>
                <div
                    className="scrollbar-thumb"
                    onMouseDown={handleThumbMouseDown}
                    style={{
                        [vertical ? 'height' : 'width']: `${
                            trackSize * (scrollSize ? clientSize / scrollSize : 0)
                        }px`,
                        transform: `translate${vertical ? 'Y' : 'X'}(${thumbPosition}px)`,
                    }}
                    ref={thumbRef}
                />
            </div>
            <div
                className="scrollbar-button scrollbar-button-increment"
                onMouseDown={handleIncrementMouseDown}
            >
                <svg className="icon" viewBox="0 0 50 50">
                    <polygon points={vertical ? '0,0 25,50 50,0' : '0,0 50,25 0,50'} />
                </svg>
            </div>
        </div>
    );
}

export default memo(Scrollbar);
