import React from 'react';
import {LoginProps} from './Login';

export default function LoginButton({service}: LoginProps) {
    return (
        <p>
            <button className="branded login" onClick={service.login}>
                Login to {service.name}
            </button>
        </p>
    );
}
