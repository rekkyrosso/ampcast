import React from 'react';
import Button from 'components/Button';

export interface PopupMenuItemProps {
    label: string;
    action: string;
    acceleratorKey?: string;
}

export default function PopupMenuItem({label, acceleratorKey = '', action}: PopupMenuItemProps) {
    return (
        <li className="popup-menu-item">
            <Button value={action}>
                <span className="popup-menu-item-label">{label}</span>
                <span className="popup-menu-item-accelerator-key">{acceleratorKey}</span>
            </Button>
        </li>
    );
}
