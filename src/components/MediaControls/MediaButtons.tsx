import React, {useCallback} from 'react';
import {clamp} from 'utils';
import {MAX_DURATION} from 'services/constants';
import mediaPlayback, {pause, play, stop} from 'services/mediaPlayback';
import {observeCurrentIndex, observeCurrentItem, observeSize} from 'services/playlist';
import IconButton from 'components/Button';
import useObservable from 'hooks/useObservable';
import usePaused from 'hooks/usePaused';
import usePlaybackState from 'hooks/usePlaybackState';
import MediaButton from './MediaButton';
import {MediaControlsProps} from './MediaControls';

export default function MediaButtons({overlay, playlistRef}: MediaControlsProps) {
    const Button = overlay ? IconButton : MediaButton;
    const currentIndex = useObservable(observeCurrentIndex, -1);
    const currentItem = useObservable(observeCurrentItem, null);
    const size = useObservable(observeSize, 0);
    const {duration} = usePlaybackState();
    const paused = usePaused();
    const isInfiniteStream = duration === MAX_DURATION;
    const unpausable = currentItem?.isLivePlayback || isInfiniteStream;
    const tabIndex = overlay ? -1 : undefined;

    const handlePrevClick = useCallback(async () => {
        const playlist = playlistRef?.current;
        const index = clamp(0, currentIndex - 1, size - 1);
        playlist?.scrollIntoView(index);
        playlist?.focus();
        mediaPlayback.prev();
    }, [playlistRef, currentIndex, size]);

    const handleNextClick = useCallback(async () => {
        const playlist = playlistRef?.current;
        const index = clamp(0, currentIndex + 1, size - 1);
        playlist?.scrollIntoView(index);
        playlist?.focus();
        mediaPlayback.next();
    }, [playlistRef, currentIndex, size]);

    return (
        <>
            <Button
                aria-label="Previous track"
                icon="prev"
                tabIndex={tabIndex}
                onClick={handlePrevClick}
            />
            <Button
                aria-label={paused ? 'Play' : 'Pause'}
                icon={paused ? 'play' : 'pause'}
                tabIndex={tabIndex}
                onClick={paused ? play : pause}
                disabled={unpausable && !paused}
            />
            <Button aria-label="Stop" icon="stop" tabIndex={tabIndex} onClick={stop} />
            <Button
                aria-label="Next track"
                icon="next"
                tabIndex={tabIndex}
                onClick={handleNextClick}
            />
        </>
    );
}
