import React, {useMemo} from 'react';
import {FallbackProps} from 'react-error-boundary';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import {FullScreenError} from 'services/errors';
import EmptyScreen from 'components/EmptyScreen';
import ErrorScreen from 'components/ErrorScreen';
import PageHeader from './PageHeader';

export default function useErrorScreen<T extends MediaObject>(
    service: MediaService,
    sources: readonly MediaSource<T>[]
) {
    return useMemo(() => {
        return function MediaBrowserError({error}: FallbackProps) {
            const reportingId = sources?.length === 1 ? sources[0]?.id : service?.id;

            return error instanceof FullScreenError ? (
                <>
                    <PageHeader icon={service?.icon}>
                        {sources?.length === 1
                            ? `${service?.name}: ${sources[0]?.title}`
                            : service?.name}
                    </PageHeader>
                    <EmptyScreen>
                        <div className="note">
                            <p>{error?.message || String(error)}</p>
                        </div>
                    </EmptyScreen>
                </>
            ) : (
                <ErrorScreen error={error} reportingId={reportingId}>
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
    }, [service, sources]);
}
