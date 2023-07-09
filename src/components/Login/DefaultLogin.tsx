import React from 'react';
import LoginButton from './LoginButton';
import ServiceLink from './ServiceLink';
import LoginRequired from './LoginRequired';
import {LoginProps} from './Login';

export default function DefaultLogin({service}: LoginProps) {
    return (
        <div className="panel">
            <div className="page login">
                <LoginRequired service={service} />
                <LoginButton service={service} />
                <ServiceLink service={service} />
            </div>
        </div>
    );
}
