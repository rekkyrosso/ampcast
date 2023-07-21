import React, {useMemo} from 'react';
import {FallbackProps} from 'react-error-boundary';
import MediaService from 'types/MediaService';
import {FullScreenError} from 'services/errors';
import EmptyScreen from 'components/EmptyScreen';
import ErrorScreen from 'components/ErrorScreen';

export default function useErrorScreen(service: MediaService) {
    return useMemo(() => {
        return function MediaBrowserError({error}: FallbackProps) {
            return error instanceof FullScreenError ? (
                <EmptyScreen>
                    <div className="note">
                        <p>{error?.message || String(error)}</p>
                    </div>
                </EmptyScreen>
            ) : (
                <ErrorScreen error={error}>
                    {service && (
                        <p className="buttons">
                            <button className="disconnect" onClick={service.logout}>
                                Reconnect to {service.name}...
                            </button>
                        </p>
                    )}
                </ErrorScreen>
            );
        };
    }, [service]);
}
