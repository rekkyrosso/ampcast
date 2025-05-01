import React from 'react';
import useCurrentTime from 'hooks/useCurrentTime';
import usePaused from 'hooks/usePaused';
import useLoadingState from './useLoadingState';

export default function PlaybackState() {
    const loadingState = useLoadingState();
    const paused = usePaused();
    const currentTime = useCurrentTime();
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
