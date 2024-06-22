import React from 'react';
import ExternalLink from 'components/ExternalLink';
import {LoginProps} from './Login';
import './CredentialsRequired.scss';

export default function CredentialsRequired({service}: LoginProps) {
    const credentialsUrl = service.credentialsUrl;

    return (
        <div className="credentials-required note">
            <p>Please register a client application to continue.</p>
            {credentialsUrl ? (
                <p className={`${service.id}-link service-link`}>
                    <ExternalLink href={credentialsUrl}>{credentialsUrl}</ExternalLink>
                </p>
            ) : null}
        </div>
    );
}
