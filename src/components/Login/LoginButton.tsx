import React from 'react';
import MediaService from 'types/MediaService';
import ProgressRing from 'components/MediaList/ProgressRing';
import useConnecting from './useConnecting';

export interface LoginButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    service: MediaService;
}

export default function LoginButton({
    service,
    disabled,
    children = `Connect to ${service.name}…`,
    ...props
}: LoginButtonProps) {
    const connecting = useConnecting(service);
    return (
        <p>
            <button
                {...props}
                className={`login-button branded ${connecting ? 'connecting' : ''}`}
                disabled={disabled || connecting}
                onClick={service.login}
            >
                {connecting ? (
                    <span className="connecting-text">
                        <ProgressRing busy progress={0} />
                        Connecting…
                    </span>
                ) : (
                    children
                )}
            </button>
        </p>
    );
}
