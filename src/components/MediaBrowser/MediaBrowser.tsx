import React, {useEffect} from 'react';
import {ErrorBoundary} from 'react-error-boundary';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import actionsStore from 'services/actions/actionsStore';
import Login from 'components/Login';
import useIsLoggedIn from 'hooks/useIsLoggedIn';
import useIsOnLine from 'hooks/useIsOnLine';
import DefaultBrowser from './DefaultBrowser';
import NoInternetError from './NoInternetError';
import useErrorScreen from './useErrorScreen';
import './MediaBrowser.scss';

// TODO: This is still not that good but better than it was (2024-09-19).

export interface MediaBrowserProps<T extends MediaObject> {
    service: MediaService;
    sources: readonly MediaSource<T>[];
}

export default function MediaBrowser<T extends MediaObject>({
    service,
    sources,
}: MediaBrowserProps<T>) {
    const isOnLine = useIsOnLine();
    const isLoggedIn = useIsLoggedIn(service);
    const renderError = useErrorScreen(service, sources);

    return (
        <div className={`media-browser ${service.id}-browser`}>
            {service.internetRequired && !isOnLine ? (
                <NoInternetError />
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

    const SourceComponent = source?.component;

    if (SourceComponent) {
        return <SourceComponent service={service} source={source} />;
    } else {
        return <DefaultBrowser service={service} sources={sources} />;
    }
}
