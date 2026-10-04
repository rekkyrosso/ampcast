import './MediaBrowser.scss';
import React, {useEffect} from 'react';
import {ErrorBoundary} from 'react-error-boundary';
import ItemType from 'types/ItemType';
import MediaService from 'types/MediaService';
import {AnyMediaSource} from 'types/MediaSource';
import {isPersonalMediaService} from 'services/mediaServices';
import Login from 'components/Login';
import useIsLibraryLoading from 'hooks/useIsLibraryLoading';
import useIsLoggedIn from 'hooks/useIsLoggedIn';
import useIsServiceVisible from 'hooks/useIsServiceVisible';
import BrowserContexts from './BrowserContexts';
import DefaultBrowser from './DefaultBrowser';
import ErrorScreen from './ErrorScreen';
import FilterBrowser from './FilterBrowser';
import FolderBrowser from './FolderBrowser';
import LibraryLoadingScreen from './LibraryLoadingScreen';
import ServiceHidden from './ServiceHidden';
import useErrorScreen from './useErrorScreen';
import useNoInternetError from './useNoInternetError';

export interface MediaBrowserProps {
    service: MediaService;
    source: AnyMediaSource;
}

export default function MediaBrowser({service, source}: MediaBrowserProps) {
    const isServiceVisible = useIsServiceVisible(service);
    const isLoggedIn = useIsLoggedIn(service);
    const isLibraryLoading = useIsLibraryLoading(service);
    const renderError = useErrorScreen(service, source);
    const noInternetError = useNoInternetError(service);
    const Browser =
        source.Component ||
        (source.itemType === ItemType.Folder
            ? FolderBrowser
            : 'filterType' in source
              ? (FilterBrowser as any)
              : DefaultBrowser);

    useEffect(() => {
        if (isPersonalMediaService(service)) {
            // For iBroadcast.
            if (isLoggedIn) {
                service.loadLibrary?.();
            }
        }
    }, [service, isLoggedIn]);

    return (
        <div className={`media-browser ${service.id}-browser`}>
            {!isServiceVisible ? (
                <ServiceHidden service={service} source={source} />
            ) : noInternetError ? (
                <ErrorScreen error={noInternetError} reportingId={service?.id} service={service} />
            ) : isLoggedIn ? (
                isLibraryLoading ? (
                    <LibraryLoadingScreen service={service} />
                ) : (
                    <ErrorBoundary fallbackRender={renderError}>
                        <BrowserContexts>
                            <Browser service={service} source={source} />
                        </BrowserContexts>
                    </ErrorBoundary>
                )
            ) : (
                <Login service={service} />
            )}
        </div>
    );
}
