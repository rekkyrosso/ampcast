import React, {useId} from 'react';
import MediaService from 'types/MediaService';
import {isSourceVisible} from 'services/mediaServices/servicesSettings';
import MediaServiceLabel from 'components/MediaSources/MediaServiceLabel';
import './MediaServiceList.scss';

export interface MediaServiceListProps {
    services: readonly MediaService[];
    multiSelect?: boolean;
}

export default function MediaServiceList({services, multiSelect}: MediaServiceListProps) {
    const id = useId();
    const type = multiSelect ? 'checkbox' : 'radio';

    return services.length === 0 ? (
        <div className="note">
            <p>No services configured.</p>
        </div>
    ) : (
        <ul className="media-service-list checkbox-list">
            {!multiSelect ? (
                <li className="no-icon" key="none">
                    <input
                        id={`${id}-none`}
                        type={type}
                        name={id}
                        value=""
                        defaultChecked={!services.some(isSourceVisible)}
                    />
                    <label htmlFor={`${id}-none`}>None</label>
                </li>
            ) : null}
            {services
                .map((service) => ({
                    ...service,
                    name: service.listingName || service.name,
                }))
                .map((service) => (
                    <li key={service.id}>
                        <input
                            id={`${id}-${service.id}`}
                            type={type}
                            name={multiSelect ? undefined : id}
                            value={service.id}
                            defaultChecked={isSourceVisible(service)}
                        />
                        <label htmlFor={`${id}-${service.id}`}>
                            <MediaServiceLabel service={service} showRestrictedAccess />
                        </label>
                    </li>
                ))}
        </ul>
    );
}
