import React from 'react';
import Icon, {IconName} from 'components/Icon';
import './MediaButton.scss';

export interface MediaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: IconName;
    onClick?: () => void;
}

export default function MediaButton({icon, onClick, ...props}: MediaButtonProps) {
    return (
        <button {...props} className={`media-button media-button-${icon}`} onClick={onClick}>
            <Icon name={icon} />
        </button>
    );
}
