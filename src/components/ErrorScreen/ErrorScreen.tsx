import React from 'react';
import './ErrorScreen.scss';

export interface ErrorScreenProps {
    error: Error;
    children?: React.ReactNode;
    resetErrorBoundary?: (...args: Array<unknown>) => void;
}

export default function ErrorScreen({error, children}: ErrorScreenProps) {
    return (
        <div className="panel error-screen">
            <div className="error-screen-content">
                <h2>Error</h2>
                <pre className="note error">{error?.message || String(error)}</pre>
                {children}
            </div>
        </div>
    );
}
