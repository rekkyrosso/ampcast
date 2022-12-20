import React from 'react';
import {LoginProps} from './Login';

export default function LoginButton({service}: LoginProps) {
    return (
        <p>
            <button className="branded login" onClick={service.login}>
                Log in to {service.name}
            </button>
        </p>
    );
}
