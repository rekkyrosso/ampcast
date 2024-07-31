import React from 'react';
import {observeCurrentTime} from 'services/mediaPlayback';
import useObservable from 'hooks/useObservable';
import usePaused from 'hooks/usePaused';
import useLoadingState from './useLoadingState';

export default function PlaybackState() {
    const loadingState = useLoadingState();
    const paused = usePaused();
    const currentTime = useObservable(observeCurrentTime, 0);
    const started = currentTime > 0;

    return (
        <p className="media-state playback-state">
            {loadingState === 'error'
                ? 'error'
                : paused
                ? started
                    ? 'paused'
                    : ''
                : loadingState === 'loaded'
                ? 'playing'
                : loadingState}
        </p>
    );
}
