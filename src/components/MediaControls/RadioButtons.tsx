import React, {useCallback, useEffect, useState} from 'react';
import mediaPlayback from 'services/mediaPlayback';
import Icon from 'components/Icon';
import IconButton from 'components/Button';
import MediaButton from 'components/MediaControls/MediaButton';
import usePlaybackState from 'hooks/usePlaybackState';
import {MediaControlsProps} from './MediaControls';

export default function RadioButtons({overlay}: MediaControlsProps) {
    const Button = overlay ? IconButton : MediaButton;
    const [disabled, setDisabled] = useState(true);
    const {currentTime, startedAt} = usePlaybackState();
    const playbackStarted = currentTime >= 1 && Date.now() - startedAt >= 1000;
    const tabIndex = overlay ? -1 : undefined;

    useEffect(() => {
        if (playbackStarted) {
            setDisabled(false);
        }
    }, [playbackStarted]);

    const skipNext = useCallback(async () => {
        setDisabled(true);
        await mediaPlayback.skipNext();
        setDisabled(false);
    }, []);

    const skipPrev = useCallback(async () => {
        setDisabled(true);
        await mediaPlayback.skipPrev();
        setDisabled(false);
    }, []);

    return (
        <>
            {overlay ? <Icon name="radio" /> : null}
            <Button
                icon="play-reversed"
                title="Previous radio track"
                onClick={skipPrev}
                disabled={disabled}
                tabIndex={tabIndex}
            />
            <Button
                icon="play"
                title="Next radio track"
                onClick={skipNext}
                disabled={disabled}
                tabIndex={tabIndex}
            />
        </>
    );
}
