import React from 'react';
import {Except} from 'type-fest';
import Icon, {IconName} from 'components/Icon';
import {preventDefault} from 'utils';
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
            type="button"
            onMouseDown={preventDefault}
        >
            <Icon name={icon} />
        </button>
    );
}
