import React from 'react';
import MediaService from 'types/MediaService';
import {MediaSourceError} from 'services/errors';
import HandledError from './HandledError';
import UnhandledError from './UnhandledError';
import './ErrorBox.scss';

export interface ErrorBoxProps {
    error: unknown;
    reportedBy?: string;
    reportingId?: string;
    service?: MediaService;
    className?: string;
    children?: React.ReactNode;
}

export default function ErrorBox({error, className = '', children, ...props}: ErrorBoxProps) {
    return (
        <div className={`error-box ${className}`}>
            {error instanceof MediaSourceError ? (
                <HandledError {...props} error={error}>
                    {children}
                </HandledError>
            ) : (
                <UnhandledError {...props} error={error}>
                    {children}
                </UnhandledError>
            )}
        </div>
    );
}
