import React from 'react';
import MediaService from 'types/MediaService';
import {isPublicMediaService} from 'services/mediaServices';
import {MediaSourceIconName} from 'components/Icon';
import MediaSourceLabel from './MediaSourceLabel';
import './MediaServiceLabel.scss';

export interface MediaServiceLabelProps {
    service: MediaService;
    showConnectivity?: boolean;
    showRestrictedAccess?: boolean;
}

export default function MediaServiceLabel({
    service,
    showConnectivity,
    showRestrictedAccess,
}: MediaServiceLabelProps) {
    const restrictedAccess =
        showRestrictedAccess && isPublicMediaService(service) && service.restrictedAccess;

    return (
        <MediaSourceLabel
            className="media-service-label"
            icon={service.icon as MediaSourceIconName}
            text={`${service.name}${restrictedAccess ? ' *' : ''}`}
            showConnectivity={showConnectivity}
        />
    );
}
