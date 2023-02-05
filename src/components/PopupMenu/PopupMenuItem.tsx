import React from 'react';
import {cancelEvent, stopPropagation} from 'utils';

export interface PopupMenuItemProps<T extends string> {
    label: string;
    action: T;
    acceleratorKey?: string;
}

export default function PopupMenuItem<T extends string>({
    label,
    acceleratorKey = '',
    action,
}: PopupMenuItemProps<T>) {
    return (
        <li className="popup-menu-item">
            <button value={action} onMouseDown={cancelEvent} onMouseUp={stopPropagation}>
                <span className="popup-menu-item-label">{label}</span>
                <span className="popup-menu-item-accelerator-key">{acceleratorKey}</span>
            </button>
        </li>
    );
}
