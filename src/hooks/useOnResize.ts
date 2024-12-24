import {useEffect, useRef} from 'react';

export interface ResizeRect {
    width: number;
    height: number;
}

export default function useOnResize(
    target: React.RefObject<HTMLElement | null> | HTMLElement | null,
    onResize: (rect: ResizeRect) => void,
    box: 'border-box' | 'content-box' = 'content-box'
): void {
    const onResizeRef = useRef(onResize);

    useEffect(() => {
        onResizeRef.current = onResize;
    }, [onResize]);

    useEffect(() => {
        const element = getElement(target);
        if (element) {
            const resizeObserver = new ResizeObserver((entries) => {
                const element = getElement(target); // make sure it's still attached
                if (element) {
                    const entry = entries.find((entry) => entry.target === element);
                    if (entry) {
                        const [{inlineSize = 0, blockSize = 0} = {}] =
                            box === 'border-box' ? entry.borderBoxSize : entry.contentBoxSize;
                        onResizeRef.current({
                            width: inlineSize,
                            height: blockSize,
                        });
                    }
                }
            });
            resizeObserver.observe(element, {box});
            return () => resizeObserver.disconnect();
        }
    }, [target, box]);
}

function getElement(
    target: React.RefObject<HTMLElement | null> | HTMLElement | null
): HTMLElement | null {
    return target && 'current' in target ? target.current : target;
}
