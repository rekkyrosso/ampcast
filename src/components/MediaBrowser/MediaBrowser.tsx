import './MediaBrowser.scss';
import React from 'react';
import {ErrorBoundary} from 'react-error-boundary';
import MediaService from 'types/MediaService';
import {AnyMediaSource} from 'types/MediaSource';
import Login from 'components/Login';
import useIsLoggedIn from 'hooks/useIsLoggedIn';
import DefaultBrowser from './DefaultBrowser';
import ErrorScreen from './ErrorScreen';
import useErrorScreen from './useErrorScreen';
import useNoInternetError from './useNoInternetError';

export interface MediaBrowserProps {
    service: MediaService;
    source: AnyMediaSource;
}

export default function MediaBrowser({service, source}: MediaBrowserProps) {
    const isLoggedIn = useIsLoggedIn(service);
    const renderError = useErrorScreen(service, source);
    const noInternetError = useNoInternetError(service);
    const Browser = source?.Component || DefaultBrowser;

    return (
        <div className={`media-browser ${service.id}-browser`}>
            {noInternetError ? (
                <ErrorScreen error={noInternetError} reportingId={service?.id} service={service} />
            ) : isLoggedIn ? (
                <ErrorBoundary fallbackRender={renderError}>
                    <Browser service={service} source={source} />
                </ErrorBoundary>
            ) : (
                <Login service={service} />
            )}
        </div>
    );
}
