import React from 'react';
import {MusicCatalogRequiredError, NoInternetError} from 'services/errors';
import MediaServiceLabel from 'components/MediaSources/MediaServiceLabel';
import {ErrorBoxProps} from './ErrorBox';
import MusicCatalogRequired from './MusicCatalogRequired';

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
                <div className="note">
                    <p>{error?.message || String(error)}</p>
                    <HandleError error={error} />
                </div>
            </div>
            {children}
        </div>
    );
}

function HandleError({error}: {error: Error}) {
    if (error instanceof MusicCatalogRequiredError) {
        return <MusicCatalogRequired error={error} />;
    } else {
        return null;
    }
}
