import React from 'react';
import MediaService from 'types/MediaService';
import DefaultLogin from './DefaultLogin';
import './Login.scss';

export interface LoginProps {
    service: MediaService;
}

export default function Login({service}: LoginProps) {
    const Login = service.components?.Login || DefaultLogin;
    return (
        <div className="panel">
            <div className={`page login login-${service.id}`}>
                <Login service={service} />
            </div>
        </div>
    );
}
