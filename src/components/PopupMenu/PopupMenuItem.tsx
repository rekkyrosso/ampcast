import React from 'react';
import {cancelEvent, stopPropagation} from 'utils';

export interface PopupMenuItemProps<T extends string> {
    label: string;
    action: T;
    checked?: boolean;
    acceleratorKey?: string;
    disabled?: boolean;
}

export default function PopupMenuItem<T extends string>({
    label,
    acceleratorKey = '',
    checked,
    disabled,
    action,
}: PopupMenuItemProps<T>) {
    return (
        <li className={`popup-menu-item ${checked ? 'checked' : ''}`}>
            <button
                value={action}
                disabled={disabled}
                onMouseDown={cancelEvent}
                onMouseUp={stopPropagation}
            >
                <span className="popup-menu-item-label">{label}</span>
                <span className="popup-menu-item-accelerator-key">{acceleratorKey}</span>
            </button>
        </li>
    );
}
