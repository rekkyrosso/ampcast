import React from 'react';
import MediaService from 'types/MediaService';
import './MediaServiceCredentials.scss';

export interface MediaServiceCredentialsProps {
    service: MediaService;
}

export default function MediaServiceCredentials({service}: MediaServiceCredentialsProps) {
    const Credentials = service.components?.Credentials || NotFound;
    return (
        <div className="media-service-credentials">
            {service.credentialsRequired ? (
                <Credentials service={service} />
            ) : (
                <NotRequired service={service} />
            )}
        </div>
    );
}

function NotFound({service}: MediaServiceCredentialsProps) {
    return (
        <div className="note error">
            <p>Credentials screen not found for {service.name}.</p>
        </div>
    );
}

function NotRequired({service}: MediaServiceCredentialsProps) {
    return (
        <div className="note">
            <p>Credentials not required for {service.name}.</p>
        </div>
    );
}
