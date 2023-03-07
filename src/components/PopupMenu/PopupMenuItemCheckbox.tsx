import React from 'react';
import {Except} from 'type-fest';
import PopupMenuItem, {PopupMenuItemProps} from './PopupMenuItem';

export interface PopupMenuItemCheckboxProps<T extends string>
    extends Except<PopupMenuItemProps<T>, 'role'> {
    checked?: boolean;
}

export default function PopupMenuItemCheckbox<T extends string>({
    className = '',
    checked = false,
    ...props
}: PopupMenuItemCheckboxProps<T>) {
    return (
        <PopupMenuItem
            {...props}
            className={`popup-menu-item-checkbox ${className}`}
            role="menuitemcheckbox"
            aria-checked={checked}
        />
    );
}
