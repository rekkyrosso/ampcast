import React, {useMemo} from 'react';
import {FallbackProps} from 'react-error-boundary';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import ErrorScreen from './ErrorScreen';

export default function useErrorScreen<T extends MediaObject>(
    service: MediaService,
    sources: readonly MediaSource<T>[]
) {
    return useMemo(() => {
        return function MediaBrowserError({error}: FallbackProps) {
            const reportingId = sources?.length === 1 ? sources[0]?.id : service?.id;
            return <ErrorScreen error={error} reportingId={reportingId} service={service} />;
        };
    }, [service, sources]);
}
