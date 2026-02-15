import React, {useCallback, useId, useImperativeHandle, useRef} from 'react';
import useOnResize from 'hooks/useOnResize';
import {ScrollableProps} from './Scrollable';
import useScrollableComponents from './useScrollableComponents';
import './ScrollableNative.scss';

export default function ScrollableNative({
    children,
    scrollWidth,
    scrollHeight,
    onResize,
    onScroll,
    ref,
}: ScrollableProps) {
    const scrollableId = useId();
    const [head, body] = useScrollableComponents(children);
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
        scrollTo: (options) => {
            containerRef.current!.scrollTo(options);
        },
    }));

    useOnResize(containerRef, () => {
        onResize?.(containerRef.current!);
    });

    const handleScroll = useCallback(() => {
        onScroll?.({
            left: containerRef.current!.scrollLeft,
            top: containerRef.current!.scrollTop,
        });
    }, [onScroll]);

    return (
        <div
            className="scrollable scrollable-native"
            id={scrollableId}
            onScroll={handleScroll}
            ref={containerRef}
        >
            <div
                className="scrollable-content"
                style={{
                    width: scrollWidth ? `${scrollWidth}px` : undefined,
                    height: scrollHeight ? `${scrollHeight}px` : undefined,
                }}
            >
                {head ? <div className="scrollable-head">{head}</div> : null}
                <div className="scrollable-body">{body}</div>
            </div>
        </div>
    );
}
