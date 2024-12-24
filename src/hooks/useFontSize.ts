import {useEffect, useState} from 'react';
import useOnResize from './useOnResize';

const resizerCSS = `
    display: block;
    position: absolute;
    pointer-events: none;
    visibility: hidden;
    font-size: inherit;
    width: 1em;
    height: 1em;
    z-index: -2;
`;

export default function useFontSize(
    target: React.RefObject<HTMLElement | null> | HTMLElement | null
): number {
    const [resizer, setResizer] = useState<HTMLElement | null>(null);
    const [fontSize, setFontSize] = useState(() => getFontSize(target));

    useEffect(() => {
        const element = getElement(target);
        if (element) {
            const resizer = document.createElement('div');
            resizer.style.cssText = resizerCSS;
            element.append(resizer);
            setResizer(resizer);
            return () => {
                resizer.remove();
                setResizer(null);
            };
        }
    }, [target]);

    useOnResize(resizer, () => setFontSize(getFontSize(resizer)));

    return fontSize;
}

function getFontSize(target: React.RefObject<HTMLElement | null> | HTMLElement | null): number {
    const element = getElement(target);
    return element ? parseFloat(getComputedStyle(element).fontSize) || 0 : 0;
}

function getElement(
    target: React.RefObject<HTMLElement | null> | HTMLElement | null
): HTMLElement | null {
    return target && 'current' in target ? target.current : target;
}
