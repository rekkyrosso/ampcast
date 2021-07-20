import React from 'react';
import './StatusBar.scss';

export interface StatusBarProps {
    children: React.ReactNode;
}

export default function StatusBar({children}: StatusBarProps) {
    return <footer className="status-bar">{children}</footer>;
}
