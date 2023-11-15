import React from 'react';
import {ErrorBoundary} from 'react-error-boundary';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import Login from 'components/Login';
import useObservable from 'hooks/useObservable';
import useIsOnLine from 'hooks/useIsOnLine';
import NoInternetError from './NoInternetError';
import useErrorScreen from './useErrorScreen';
import './MediaBrowser.scss';
import Router from './Router';

export interface MediaBrowserProps<T extends MediaObject> {
    service: MediaService;
    sources: readonly MediaSource<T>[];
}

export default function MediaBrowser<T extends MediaObject>({
    service,
    sources,
}: MediaBrowserProps<T>) {
    const isOnLine = useIsOnLine();
    const isLoggedIn = useObservable(service.observeIsLoggedIn, service.isLoggedIn());
    const renderError = useErrorScreen(service, sources);

    return (
        <div className={`media-browser ${service.id}-browser`}>
            <ErrorBoundary fallbackRender={renderError}>
                {service.internetRequired && !isOnLine ? (
                    <NoInternetError />
                ) : isLoggedIn ? (
                    <Router service={service} sources={sources} />
                ) : (
                    <Login service={service} />
                )}
            </ErrorBoundary>
        </div>
    );
}
