import React from 'react';
import MediaService from 'types/MediaService';
import {getAuthService} from 'services/mediaServices';
import {MediaSourceIconName} from 'components/Icon';
import MediaSourceLabel from './MediaSourceLabel';
import './MediaServiceLabel.scss';

export interface MediaServiceLabelProps {
    service: MediaService;
    showConnectivity?: boolean;
}

export default function MediaServiceLabel({service, showConnectivity}: MediaServiceLabelProps) {
    const authService = getAuthService(service);

    return (
        <MediaSourceLabel
            className="media-service-label"
            icon={service.icon as MediaSourceIconName}
            text={
                service === authService ? (
                    service.name
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
