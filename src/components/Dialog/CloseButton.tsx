import React from 'react';
import {stopPropagation} from 'utils';
import Icon from 'components/Icon';
import './CloseButton.scss';

export interface CloseButtonProps {
    close: () => void;
}

export default function CloseButton({close}: CloseButtonProps) {
    return (
        <div
            className="close-button button"
            role="button"
            aria-label="Close"
            onClick={close}
            onMouseDown={stopPropagation}
        >
            <Icon name="close" />
        </div>
    );
}
