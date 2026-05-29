import React from 'react';
import {NoInternetError} from 'services/errors';
import MediaServiceLabel from 'components/MediaSources/MediaServiceLabel';
import {ErrorBoxProps} from './ErrorBox';

type HandledErrorProps = ErrorBoxProps & {
    error: Error;
};

export default function HandledError({error, service, children}: HandledErrorProps) {
    return (
        <div className="handled-error">
            {service && error instanceof NoInternetError ? (
                <h2>
                    <MediaServiceLabel service={service} />
                </h2>
            ) : null}
            <div className="error-report">
                <p className="note">{error?.message || String(error)}</p>
            </div>
            {children}
        </div>
    );
}
