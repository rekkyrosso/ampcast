import React from 'react';
import Icon, {IconName} from 'components/Icon';
import MediaButton, {MediaButtonProps} from './MediaButton';

export interface MediaIconButtonProps extends MediaButtonProps {
    icon: IconName;
}

export default function MediaIconButton({icon, ...props}: MediaIconButtonProps) {
    return (
        <MediaButton {...props} className={`media-button-icon media-button-${icon}`}>
            <Icon name={icon} />
        </MediaButton>
    );
}
