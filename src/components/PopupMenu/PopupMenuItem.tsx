import React from 'react';

export interface PopupMenuItemProps {
    label: string;
    action: string;
    acceleratorKey?: string;
}

export default function PopupMenuItem({label, acceleratorKey = '', action}: PopupMenuItemProps) {
    return (
        <li className="popup-menu-item">
            <button value={action}>
                <span className="popup-menu-item-label">{label}</span>
                <span className="popup-menu-item-accelerator-key">{acceleratorKey}</span>
            </button>
        </li>
    );
}
