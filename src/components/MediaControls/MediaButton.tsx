import React from 'react';
import Button from 'components/Button';
import Icon, {IconName} from 'components/Icon';
import './MediaButton.scss';

export interface MediaButtonProps {
    icon: IconName;
    onClick?: () => void;
}

export default function MediaButton({icon, onClick}: MediaButtonProps) {
    return (
        <Button className={`media-button media-button-${icon}`} onClick={onClick}>
            <Icon name={icon} />
        </Button>
    );
}
