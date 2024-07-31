import React from 'react';
import {pause, play, prev, next, stop} from 'services/mediaPlayback';
import IconButton from 'components/Button';
import IconButtons from 'components/Button/IconButtons';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import usePaused from 'hooks/usePaused';

export default function MediaButtons() {
    const currentlyPlaying = useCurrentlyPlaying();
    const paused = usePaused();

    return currentlyPlaying ? (
        <IconButtons className="media-buttons">
            <IconButton aria-label="Previous track" icon="prev" tabIndex={-1} onClick={prev} />
            <IconButton
                aria-label={paused ? 'Play' : 'Pause'}
                icon={paused ? 'play' : 'pause'}
                tabIndex={-1}
                onClick={paused ? play : pause}
            />
            <IconButton aria-label="Stop" icon="stop" onClick={stop} />
            <IconButton aria-label="Next track" icon="next" tabIndex={-1} onClick={next} />
        </IconButtons>
    ) : null;
}
