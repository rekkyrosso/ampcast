import React from 'react';
import MediaService from 'types/MediaService';
import {MediaSourceIconName} from 'components/Icon';
import MediaSourceLabel from './MediaSourceLabel';

export interface MediaServiceLabelProps {
    service: MediaService;
    showConnectivity?: boolean;
}

export default function MediaServiceLabel({
    service,
    showConnectivity,
}: MediaServiceLabelProps) {
    return (
        <MediaSourceLabel
            className="media-service-label"
            icon={service.icon as MediaSourceIconName}
            text={service.name}
            showConnectivity={showConnectivity}
        />
    );
}
