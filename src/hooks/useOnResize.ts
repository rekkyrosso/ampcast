import {useEffect, useLayoutEffect, useRef} from 'react';

export default function useOnResize<T extends HTMLElement>(
    elementRef: React.MutableRefObject<T | null>,
    onResize: () => void
): void {
    const onResizeRef = useRef(onResize);

    useEffect(() => {
        onResizeRef.current = onResize;
    }, [onResize]);

    useLayoutEffect(() => {
        const element = elementRef.current;
        if (element) {
            const resizeObserver = new ResizeObserver(() => onResizeRef.current());
            resizeObserver.observe(element);
            return () => resizeObserver.disconnect();
        }
    }, [elementRef]);
}
