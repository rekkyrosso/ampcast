import React from 'react';
import {Except} from 'type-fest';
import {cancelEvent, stopPropagation} from 'utils';
import Icon, {IconName} from 'components/Icon';
import './IconButton.scss';

export interface IconButtonProps
    extends Except<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    icon: IconName;
}

export default function IconButton({icon, className = '', ...props}: IconButtonProps) {
    return (
        <button
            {...props}
            className={`icon-button icon-button-${icon} ${className}`}
            onMouseDown={cancelEvent}
            onDoubleClick={stopPropagation}
        >
            <Icon name={icon} />
        </button>
    );
}
