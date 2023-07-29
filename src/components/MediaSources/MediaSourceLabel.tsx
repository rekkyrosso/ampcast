import React from 'react';
import Icon, {IconName, MediaSourceIconName} from 'components/Icon';
import './MediaSourceLabel.scss';

export type MediaSourceLabelProps =
    | {
          icon: IconName;
          text: React.ReactNode;
          className?: string;
          showConnectivity?: never;
      }
    | {
          icon: MediaSourceIconName;
          text: React.ReactNode;
          className?: string;
          showConnectivity?: boolean;
      };

export default function MediaSourceLabel({icon, text, className='', showConnectivity}: MediaSourceLabelProps) {
    return (
        <span className={`media-source-label ${className}`}>
            <Icon name={icon} className={showConnectivity ? 'show-connectivity' : ''} />
            <span className="text">{text}</span>
        </span>
    );
}
