import React, {useCallback} from 'react';
import MediaService from 'types/MediaService';
import Button from 'components/Button';
import {showCredentialsDialog} from 'components/Settings/MediaLibrarySettings/CredentialsDialog';

export interface CredentialsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    service: MediaService;
}

export default function CredentialsButton({
    service,
    className = 'credentials-button',
    children = 'Enter credentials…',
    ...props
}: CredentialsButtonProps) {
    const handleClick = useCallback(() => {
        showCredentialsDialog(service);
    }, [service]);

    return (
        <p>
            <Button {...props} className={className} onClick={handleClick}>
                {children}
            </Button>
        </p>
    );
}
