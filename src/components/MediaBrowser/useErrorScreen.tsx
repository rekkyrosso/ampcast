import React, {useMemo} from 'react';
import {FallbackProps} from 'react-error-boundary';
import MediaService from 'types/MediaService';
import {AnyMediaSource} from 'types/MediaSource';
import ErrorScreen from './ErrorScreen';

export default function useErrorScreen(
    service: MediaService,
    source: AnyMediaSource
) {
    return useMemo(() => {
        return function MediaBrowserError({error}: FallbackProps) {
            return <ErrorScreen error={error} reportingId={source.id} service={service} />;
        };
    }, [service, source]);
}
