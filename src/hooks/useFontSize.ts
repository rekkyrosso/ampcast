import {useCallback, useEffect, useRef, useState} from 'react';
import useOnResize from './useOnResize';

const resizer = document.createElement('div');
resizer.style.cssText = `
    position: absolute;
    pointer-events: none;
    visibility: hidden;
    font-size: 1rem;
    width: 1rem;
    height: 1rem;
`;

export default function useFontSize(): number {
    const resizerRef = useRef(resizer);
    const [fontSize, setFontSize] = useState(0);

    useEffect(() => {
        if (!resizer.parentElement) {
            document.body.append(resizer);
            setFontSize(getFontSize());
        }
    }, []);

    useOnResize(
        resizerRef,
        useCallback(() => setFontSize(getFontSize()), [])
    );

    return fontSize;
}

function getFontSize(): number {
    return parseInt(getComputedStyle(resizer).fontSize, 10) || 16;
}
