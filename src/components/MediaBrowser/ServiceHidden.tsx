import React from 'react';
import MediaService from 'types/MediaService';
import {isServiceDisabled} from 'services/mediaServices/buildConfig';
import MediaServiceLabel from 'components/MediaSources/MediaServiceLabel';
import useVisibleServices from 'hooks/useVisibleServices';
import './ServiceHidden.scss';

export interface ServiceHiddenProps {
    service: MediaService;
}

export default function ServiceHidden({service}: ServiceHiddenProps) {
    const visibleServices = useVisibleServices();
    const hasServices = visibleServices.length > 0;

    return (
        <div className="panel">
            {hasServices ? (
                <div className="page service-hidden">
                    <h2>
                        <MediaServiceLabel service={service} />
                    </h2>
                    <div className="note">
                        <p>
                            {isServiceDisabled(service)
                                ? 'This service is disabled.'
                                : 'You have not enabled this service.'}
                        </p>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
