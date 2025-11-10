import React from 'react';

export interface PopupMenuItemGroupProps {
    className?: string;
    children: React.ReactNode;
}

export default function PopupMenuItemGroup({className = '', children}: PopupMenuItemGroupProps) {
    return (
        <li className={`popup-menu-group ${className}`}>
            <ul role="group">{children}</ul>
        </li>
    );
}
