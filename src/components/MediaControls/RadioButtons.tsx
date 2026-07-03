import React, {useCallback, useEffect, useState} from 'react';
import {stopPropagation} from 'utils';
import mediaPlayback from 'services/mediaPlayback';
import mediaPlayer from 'services/mediaPlayback/mediaPlayer';
import Icon from 'components/Icon';
import {IconButton} from 'components/Button';
import MediaButton from 'components/MediaControls/MediaButton';
import useObservable from 'hooks/useObservable';
import usePlaybackState from 'hooks/usePlaybackState';
import {MediaControlsProps} from './MediaControls';

const observeCanSkipNext = () => mediaPlayer.observeCanSkipNext();
const observeCanSkipPrev = () => mediaPlayer.observeCanSkipPrev();

export default function RadioButtons({overlay}: MediaControlsProps) {
    const Button = overlay ? IconButton : MediaButton;
    const [disabled, setDisabled] = useState(true);
    const {currentTime, startedAt} = usePlaybackState();
    const playbackStarted = currentTime >= 1 && Date.now() - startedAt >= 1000;
    const tabIndex = overlay ? -1 : undefined;
    const canSkipNext = useObservable(observeCanSkipNext, false);
    const canSkipPrev = useObservable(observeCanSkipPrev, false);

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
                icon="radio-prev"
                title="Previous radio track"
                onClick={skipPrev}
                onDoubleClick={stopPropagation}
                disabled={disabled || !canSkipPrev}
                tabIndex={tabIndex}
            />
            <Button
                icon="radio-next"
                title="Next radio track"
                onClick={skipNext}
                onDoubleClick={stopPropagation}
                disabled={disabled || !canSkipNext}
                tabIndex={tabIndex}
            />
        </>
    );
}
