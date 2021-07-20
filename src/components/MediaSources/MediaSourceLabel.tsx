import React from 'react';
import Icon, {IconName, MediaSourceIconName} from 'components/Icon';
import './MediaSourceLabel.scss';

export type MediaSourceLabelProps =
    | {
          icon: IconName;
          text: string;
          showConnectivity?: never;
      }
    | {
          icon: MediaSourceIconName;
          text: string;
          showConnectivity?: boolean;
      };

export default function MediaSourceLabel({icon, text, showConnectivity}: MediaSourceLabelProps) {
    return (
        <span className="media-source-label">
            <Icon name={icon} className={showConnectivity ? 'show-connectivity' : ''} />
            <span className="text">{text}</span>
        </span>
    );
}
