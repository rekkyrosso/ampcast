import './Panel.scss';
import React from 'react';

export interface PanelProps {
    readonly className?: string;
    readonly children?: React.ReactNode;
}

export default function Panel({
    className = '',
    children,
}: PanelProps) {
    return (
        <div className={`panel ${className}`}>{children}</div>
    );
}
