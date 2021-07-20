import React from 'react';
import {Except} from 'type-fest';
import {preventDefault, stopPropagation} from 'utils';
import Icon, {IconName} from 'components/Icon';
import Button from './Button';
import './IconButton.scss';

export interface IconButtonProps
    extends Except<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    icon: IconName;
}

export default function IconButton({icon, className = '', ...props}: IconButtonProps) {
    return (
        <Button
            {...props}
            className={`icon-button icon-button-${icon} ${className}`}
            onMouseDown={preventDefault}
            onDoubleClick={stopPropagation}
        >
            <Icon name={icon} />
        </Button>
    );
}
