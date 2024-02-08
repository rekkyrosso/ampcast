import React from 'react';
import MediaService from 'types/MediaService';
import ExternalLink from 'components/ExternalLink';
import './CredentialsRequired.scss';

export interface CredentialsRequiredProps {
    service: MediaService;
    url: string;
}

export default function CredentialsRequired({service, url}: CredentialsRequiredProps) {
    return (
        <div className="credentials-required note">
            <p>Please register a client application to continue.</p>
            <p className={`${service.id}-link service-link`}>
                <ExternalLink href={url}>{url}</ExternalLink>
            </p>
        </div>
    );
}
