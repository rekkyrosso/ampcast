import React, {useMemo} from 'react';
import {FallbackProps} from 'react-error-boundary';
import MediaService from 'types/MediaService';
import ErrorScreen from 'components/ErrorScreen';

export default function useErrorScreen(service: MediaService) {
    return useMemo(() => {
        return function MediaBrowserError({error}: FallbackProps) {
            return (
                <ErrorScreen error={error}>
                    {service && (
                        <p>
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
