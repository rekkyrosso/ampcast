import React, {useCallback, useLayoutEffect, useRef, useState} from 'react';
import Scrollable, {ScrollableClient, ScrollableHandle} from 'components/Scrollable';
import './TextBox.scss';

export type TextBoxProps = React.HTMLAttributes<HTMLElement>;

export default function TextBox({className, children}: TextBoxProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollableRef = useRef<ScrollableHandle>(null);
    const [height, setHeight] = useState(0);
    const [visibility, setVisibility] = useState<'hidden' | undefined>('hidden');

    const handleResize = useCallback(
        ({scrollHeight}: ScrollableClient) => setHeight(scrollHeight),
        []
    );

    useLayoutEffect(() => {
        // TODO: Fix `Scrollable` so that is doesn't re-layout so much.
        setTimeout(() => requestAnimationFrame(() => setVisibility(undefined)), 50);
    }, []);

    return (
        <div
            className={`text-box ${className}`}
            style={{height: `${height}px`, visibility}}
            ref={containerRef}
        >
            <div style={{position: 'relative', height: '100%'}}>
                <Scrollable onResize={handleResize} scrollableRef={scrollableRef}>
                    {children}
                </Scrollable>
            </div>
        </div>
    );
}
