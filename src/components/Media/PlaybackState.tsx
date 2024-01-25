import React from 'react';
import usePaused from 'hooks/usePaused';
import useLoadingState from './useLoadingState';

export default function PlaybackState() {
    const state = useLoadingState();
    const paused = usePaused();

    return (
        <p className="media-state playback-state">
            {state === 'error' ? state : paused ? '' : `${state === 'loaded' ? 'playing' : state}…`}
        </p>
    );
}
