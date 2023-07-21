import React from 'react';
import {ErrorBoundary} from 'react-error-boundary';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import PersonalMediaService from 'types/PersonalMediaService';
import Login from 'components/Login';
import useObservable from 'hooks/useObservable';
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
    const isLoggedIn = useObservable(service.observeIsLoggedIn, false);
    const renderError = useErrorScreen(service);
    const key = `${service.id}/${(service as PersonalMediaService).libraryId || '*'}/${sources.map(
        (source) => source.id
    )}`;

    return (
        <div className={`media-browser ${service.id}-browser`} key={key}>
            {isLoggedIn ? (
                <ErrorBoundary fallbackRender={renderError}>
                    <Router service={service} sources={sources} />
                </ErrorBoundary>
            ) : (
                <Login service={service} />
            )}
        </div>
    );
}
