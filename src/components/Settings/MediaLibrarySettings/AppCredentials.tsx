import React from 'react';
import DialogButtons from 'components/Dialog/DialogButtons';
import './AppCredentials.scss';

export interface AppCredentialsProps {
    className?: string;
    children: React.ReactNode;
    onSubmit: () => void;
}

export default function AppCredentials({className, children, onSubmit}: AppCredentialsProps) {
    return (
        <form className={`app-credentials ${className}`} method="dialog" onSubmit={onSubmit}>
            {children}
            <DialogButtons />
        </form>
    );
}
