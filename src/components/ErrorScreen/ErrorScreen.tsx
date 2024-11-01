import React from 'react';
import ErrorReport from './ErrorReport';
import './ErrorScreen.scss';

export interface ErrorScreenProps {
    error: Error;
    reportingId?: string;
    children?: React.ReactNode;
    resetErrorBoundary?: (...args: Array<unknown>) => void;
}

export default function ErrorScreen({error, reportingId, children}: ErrorScreenProps) {
    return (
        <div className="panel error-screen">
            <div className="error-screen-content">
                <h2>Error</h2>
                <ErrorReport error={error} reportedBy="MediaBrowser" reportingId={reportingId} />
                {children}
            </div>
        </div>
    );
}
