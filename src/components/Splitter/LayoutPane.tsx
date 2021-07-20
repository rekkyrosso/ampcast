import React, {CSSProperties} from 'react';

export interface LayoutPaneProps {
    vertical: boolean;
    primary: boolean;
    size: number;
    children: React.ReactNode;
}

export default function LayoutPane({vertical, primary, size, children}: LayoutPaneProps) {
    const style: CSSProperties = {};

    if (!primary) {
        if (vertical) {
            style.height = `${size}px`;
        } else {
            style.width = `${size}px`;
        }
    }

    return (
        <div
            className={`layout-pane layout-pane-${primary ? 'primary' : 'secondary'}`}
            style={style}
        >
            {children}
        </div>
    );
}
