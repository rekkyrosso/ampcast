import React from 'react';
import {Except} from 'type-fest';
import MediaService from 'types/MediaService';

export interface LoginButtonProps
    extends Except<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    service: MediaService;
}

export default function LoginButton({
    service,
    onClick = service.login,
    ...props
}: LoginButtonProps) {
    return (
        <p>
            <button {...props} className="branded login" onClick={onClick}>
                Connect to {service.name}…
            </button>
        </p>
    );
}
