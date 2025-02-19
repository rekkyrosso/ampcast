import React from 'react';
import ExternalLink from 'components/ExternalLink';
import {IconName} from 'components/Icon';
import {MediaServiceCredentialsProps} from './MediaServiceCredentials';

export interface CredentialsRegistrationProps extends MediaServiceCredentialsProps {
    icon?: IconName;
    url?: string;
}

export default function CredentialsRegistration({
    service,
    icon = service.id,
    url = service.credentialsUrl,
}: CredentialsRegistrationProps) {
    return service.credentialsLocked ? (
        <div className="note credentials-locked">
            <p>These settings are configured externally.</p>
        </div>
    ) : (
        <fieldset className="credentials-registration">
            <legend>Registration</legend>
            <p>
                <ExternalLink icon={icon} href={url} />
            </p>
        </fieldset>
    );
}
