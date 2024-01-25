import React from 'react';
import ConnectionLogging from './ConnectionLogging';
import LoginButton from './LoginButton';
import ServiceLink from './ServiceLink';
import LoginRequired from './LoginRequired';
import {LoginProps} from './Login';

export default function DefaultLogin({service}: LoginProps) {
    return (
        <>
            <LoginRequired service={service} />
            <LoginButton service={service} />
            <ServiceLink service={service} />
            <ConnectionLogging service={service} />
        </>
    );
}
