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
    const authService = service.authService || service;
    const restrictedAccess =
        showRestrictedAccess && isPublicMediaService(service) && service.restrictedAccess;

    return (
        <MediaSourceLabel
            className="media-service-label"
            icon={service.icon as MediaSourceIconName}
            text={
                service === authService ? (
                    `${service.name}${restrictedAccess ? ' *' : ''}`
                ) : (
                    <>
                        {service.name}{' '}
                        <span
                            className={`auth-service auth-service-${authService.id} ${
                                showConnectivity ? 'show-connectivity' : ''
                            }`}
                            title={`via ${authService.name}`}
                        >
                            {authService.name}
                        </span>
                    </>
                )
            }
            showConnectivity={showConnectivity}
        />
    );
}
