import React from 'react';
import {stopPropagation} from 'utils';
import Icon from 'components/Icon';
import Button, {ButtonProps} from './Button';
import './CloseButton.scss';

export default function CloseButton(props: ButtonProps) {
    return (
        <Button
            {...props}
            className="close-button"
            type="button"
            aria-label="Close"
            tabIndex={-1}
            onMouseDown={stopPropagation}
        >
            <Icon name="close" />
        </Button>
    );
}
