import React, {useCallback} from 'react';
import mediaPlayback, {pause, play, stop} from 'services/mediaPlayback';
import playlist from 'services/playlist';
import IconButton from 'components/Button';
import IconButtons from 'components/Button/IconButtons';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import usePaused from 'hooks/usePaused';

export default function MediaButtons() {
    const currentlyPlaying = useCurrentlyPlaying();
    const paused = usePaused();

    const handlePrevClick = useCallback(async () => {
        if (!playlist.atStart) {
            mediaPlayback.prev();
        }
    }, []);

    const handleNextClick = useCallback(async () => {
        if (!playlist.atEnd) {
            mediaPlayback.next();
        }
    }, []);

    return currentlyPlaying ? (
        <IconButtons className="media-buttons">
            <IconButton
                className="with-overlay"
                aria-label="Previous track"
                icon="prev"
                tabIndex={-1}
                onClick={handlePrevClick}
            />
            <IconButton
                className="with-overlay"
                aria-label={paused ? 'Play' : 'Pause'}
                icon={paused ? 'play' : 'pause'}
                tabIndex={-1}
                onClick={paused ? play : pause}
            />
            <IconButton className="with-overlay" aria-label="Stop" icon="stop" onClick={stop} />
            <IconButton
                className="with-overlay"
                aria-label="Next track"
                icon="next"
                tabIndex={-1}
                onClick={handleNextClick}
            />
        </IconButtons>
    ) : null;
}
