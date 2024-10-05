import React from 'react';
import './StatusBar.scss';

export interface StatusBarProps {
    className?: string;
    children: React.ReactNode;
}

export default function StatusBar({className = '', children}: StatusBarProps) {
    return <footer className={`status-bar ${className}`}>{children}</footer>;
}
