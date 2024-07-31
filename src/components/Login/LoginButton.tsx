import React from 'react';
import MediaService from 'types/MediaService';

export interface LoginButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    service: MediaService;
}

export default function LoginButton({
    service,
    children = `Connect to ${service.name}…`,
    ...props
}: LoginButtonProps) {
    return (
        <p>
            <button {...props} className="login-button branded" onClick={service.login}>
                {children}
            </button>
        </p>
    );
}
