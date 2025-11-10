import React from 'react';
import {Except} from 'type-fest';
import PopupMenuItem, {PopupMenuItemProps} from './PopupMenuItem';

export interface PopupMenuItemRadioProps<T extends string>
    extends Except<PopupMenuItemProps<T>, 'role'> {
    checked?: boolean;
}

export default function PopupMenuItemRadio<T extends string>({
    className = '',
    checked = false,
    ...props
}: PopupMenuItemRadioProps<T>) {
    return (
        <PopupMenuItem
            {...props}
            className={`popup-menu-item-radio ${className}`}
            role="menuitemradio"
            aria-checked={checked}
        />
    );
}
