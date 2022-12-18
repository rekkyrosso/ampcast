import React, {useCallback} from 'react';
import {
    pause,
    play,
    seek,
    stop,
    prev,
    next,
    shuffle,
    observeCurrentTime,
    observeDuration,
    observePaused,
} from 'services/mediaPlayback';
import Button from 'components/Button';
import Input from 'components/Input';
import Time from 'components/Time';
import useObservable from 'hooks/useObservable';
import MediaButton from './MediaButton';
import VolumeControl from './VolumeControl';
import './MediaControls.scss';

export default function MediaControls() {
    const currentTime = useObservable(observeCurrentTime, 0);
    const duration = useObservable(observeDuration, 0);
    const paused = useObservable(observePaused, true);

    const handleSeekChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        seek(event.target.valueAsNumber);
    }, []);

    return (
        <div className="media-controls">
            <div className="current-time-control">
                <Time time={currentTime} />
                <Input
                    id="playhead"
                    type="range"
                    min={0}
                    max={duration}
                    step={1}
                    value={currentTime}
                    disabled={paused}
                    onChange={handleSeekChange}
                />
            </div>
            <div className="playback-control">
                <VolumeControl />
                <div className="media-buttons">
                    <MediaButton icon="prev" onClick={prev} />
                    <MediaButton icon={paused ? 'play' : 'pause'} onClick={paused ? play : pause} />
                    <MediaButton icon="stop" onClick={stop} />
                    <MediaButton icon="next" onClick={next} />
                </div>
                <div className="media-buttons-more">
                    <Button className="media-button media-button-shuffle" onClick={shuffle}>
                        Shuffle
                    </Button>
                </div>
            </div>
        </div>
    );
}
