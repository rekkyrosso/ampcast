import React from 'react';
import ServiceType from 'types/ServiceType';
import {LoginProps} from './Login';

export default function LoginRequired({service}: LoginProps) {
    return (
        <p>
            You need to be logged in to{' '}
            {service.serviceType === ServiceType.DataService ? 'access your data' : 'play music'} from{' '}
            {service.name}.
        </p>
    );
}
