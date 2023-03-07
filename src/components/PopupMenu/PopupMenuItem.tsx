import React, {useId} from 'react';
import {cancelEvent, stopPropagation} from 'utils';

export interface PopupMenuItemProps<T extends string>
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    value: T;
    label: string;
    acceleratorKey?: string;
}

export default function PopupMenuItem<T extends string>({
    className = '',
    label,
    acceleratorKey = '',
    role = 'menuitem',
    ...props
}: PopupMenuItemProps<T>) {
    const id = useId();

    return (
        <li className={`popup-menu-item ${className}`}>
            <button
                {...props}
                id={id}
                role={role}
                tabIndex={-1}
                onMouseDown={cancelEvent}
                onMouseUp={stopPropagation}
            >
                <span className="popup-menu-item-label">{label}</span>
                <span className="popup-menu-item-accelerator-key">{acceleratorKey}</span>
            </button>
        </li>
    );
}
