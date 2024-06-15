import React from 'react';
import {LoginProps} from './Login';
import './RestrictedAccessWarning.scss';

export default function RestrictedAccessWarning({service}: LoginProps) {
    return service.restrictedAccess && location.host === 'ampcast.app' ? (
        <div className="restricted-access-warning note">
            <p>
                This application is in <strong>development mode</strong>.
            </p>
            <p>You currently need to be an approved user to access services from {service.name}.</p>
        </div>
    ) : null;
}
