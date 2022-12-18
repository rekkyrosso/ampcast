import React from 'react';
import {LoginProps} from './Login';
import './DevMode.scss';

export default function DevMode({service}: LoginProps) {
    return (
        <div className="dev-mode note">
            <p>This application is in <strong>development mode</strong>.</p>
            <p>You currently need to be authorized to access services from {service.name}.</p>
        </div>
    );
}
