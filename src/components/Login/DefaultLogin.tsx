import React from 'react';
import LoginButton from './LoginButton';
import ServiceLink from './ServiceLink';
import {LoginProps} from './Login';

export default function DefaultLogin({service}: LoginProps) {
    return (
        <div className="panel">
            <div className="page login">
                <p>You need to be logged in to play music from {service.name}.</p>
                <LoginButton service={service} />
                <ServiceLink service={service} />
            </div>
        </div>
    );
}
