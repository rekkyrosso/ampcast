import React, {useCallback, useRef, useState} from 'react';
import Scrollable, {ScrollableClient} from 'components/Scrollable';
import './TextBox.scss';

export type TextBoxProps = React.HTMLAttributes<HTMLElement>;

export default function TextBox({className, children}: TextBoxProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(0);

    const handleResize = useCallback(
        ({scrollHeight}: ScrollableClient) => setHeight(scrollHeight),
        []
    );

    return (
        <div
            className={`text-box ${className}`}
            style={{height: `${height}px`}}
            ref={containerRef}
        >
            <div style={{position: 'relative', height: '100%'}}>
                <Scrollable onResize={handleResize}>{children}</Scrollable>
            </div>
        </div>
    );
}
