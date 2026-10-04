import React from 'react';
import {isServiceDisabled} from 'services/mediaServices/buildConfig';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import useVisibleServices from 'hooks/useVisibleServices';
import {MediaBrowserProps} from './MediaBrowser';
import './ServiceHidden.scss';

export default function ServiceHidden({service, source}: MediaBrowserProps) {
    const visibleServices = useVisibleServices();
    const hasServices = visibleServices.length > 0;

    return (
        <div className="panel">
            {hasServices ? (
                <div className="page service-hidden">
                    <h2>
                        <MediaSourceLabel
                            icon={service.icon}
                            text={
                                source === service.root
                                    ? service.name
                                    : `${service.name}: ${source.title}`
                            }
                        />
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
