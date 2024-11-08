import React from 'react';
import {ErrorBoxProps} from './ErrorBox';
import ErrorReport from './ErrorReport';

export default function UnhandledError({error, children, reportedBy='MediaBrowser', reportingId, service}: ErrorBoxProps) {
    return (
        <div className="unhandled-error">
            <h2>Error</h2>
            <ErrorReport error={error} reportedBy={reportedBy} reportingId={reportingId} />
            {service && (
                <p className="buttons">
                    <button className="disconnect" onClick={service.logout}>
                        Reconnect to {service.name}...
                    </button>
                </p>
            )}
            {children}
        </div>
    );
}
