import React from 'react';
import {LoginProps} from './Login';

export default function LoginRequired({service}: LoginProps) {
    return (
        <p>
            You need to be logged in to {service.isScrobbler ? 'access your data' : 'play music'}{' '}
            from {service.name}.
        </p>
    );
}
