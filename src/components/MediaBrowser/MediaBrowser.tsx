import './MediaBrowser.scss';
import React, {useEffect} from 'react';
import {ErrorBoundary} from 'react-error-boundary';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import actionsStore from 'services/actions/actionsStore';
import Login from 'components/Login';
import useIsLoggedIn from 'hooks/useIsLoggedIn';
import DefaultBrowser from './DefaultBrowser';
import ErrorScreen from './ErrorScreen';
import useErrorScreen from './useErrorScreen';
import useNoInternetError from './useNoInternetError';

export interface MediaBrowserProps<T extends MediaObject> {
    service: MediaService;
    sources: readonly MediaSource<T>[];
}

export default function MediaBrowser<T extends MediaObject>({
    service,
    sources,
}: MediaBrowserProps<T>) {
    const isLoggedIn = useIsLoggedIn(service);
    const renderError = useErrorScreen(service, sources);
    const noInternetError = useNoInternetError(service);

    return (
        <div className={`media-browser ${service.id}-browser`}>
            {noInternetError ? (
                <ErrorScreen error={noInternetError} reportingId={service?.id} service={service} />
            ) : isLoggedIn ? (
                <ErrorBoundary fallbackRender={renderError}>
                    <Browser service={service} sources={sources} />
                </ErrorBoundary>
            ) : (
                <Login service={service} />
            )}
        </div>
    );
}

function Browser<T extends MediaObject>({service, sources}: MediaBrowserProps<T>) {
    const source = sources.length === 1 ? sources[0] : null;
    const SourceComponent = source?.component;

    useEffect(() => {
        if (source?.lockActionsStore) {
            actionsStore.lock(service.id, source.itemType);
        } else {
            actionsStore.unlock();
        }
    }, [service, source]);

    useEffect(() => {
        return () => actionsStore.unlock(); // Teardown
    }, [service]);

    return SourceComponent ? (
        <SourceComponent service={service} source={source} />
    ) : (
        <DefaultBrowser service={service} sources={sources} />
    );
}
