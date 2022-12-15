import React from 'react';
import Button from 'components/Button';
import {LoginProps} from './Login';

export default function LoginButton({service}: LoginProps) {
    return (
        <p>
            <Button className="branded login" onClick={service.login}>
                Log in to {service.name}
            </Button>
        </p>
    );
}
