import React, {useCallback, useEffect, useRef, useState} from 'react';
import mediaPlayback, {
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
import IconButton from 'components/Button/IconButton';
import Input from 'components/Input';
import Time from 'components/Time';
import useObservable from 'hooks/useObservable';
import MediaButton from './MediaButton';
import './MediaPlaybackBar.scss';

export default function MediaPlaybackBar() {
    const seekRef = useRef<HTMLInputElement>(null);
    const volumeRef = useRef<HTMLInputElement>(null);
    const currentTime = useObservable(observeCurrentTime, 0);
    const duration = useObservable(observeDuration, 0);
    const paused = useObservable(observePaused, true);
    const [muted, setMuted] = useState(() => mediaPlayback.muted);
    const [volume, setVolume] = useState(() => mediaPlayback.volume);
    const volumeLabel = volume <= 0.33 ? 'low' : volume <= 0.67 ? 'medium' : 'high';

    useEffect(() => {
        mediaPlayback.muted = muted;
    }, [muted]);

    useEffect(() => {
        mediaPlayback.volume = volume;
    }, [volume]);

    const handleSeekChange = useCallback(() => {
        seek(seekRef.current!.valueAsNumber);
    }, []);

    const handleVolumeChange = useCallback(() => {
        const volume = volumeRef.current!.valueAsNumber;
        setVolume(volume);
        setMuted(volume === 0);
    }, []);

    const handleMuteClick = useCallback(() => {
        setMuted((muted) => !muted);
    }, []);

    return (
        <div className={`media-playback-bar volume-${volumeLabel}`}>
            <p className="media-playback-bar-current-time">
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
                    ref={seekRef}
                />
            </p>
            <div className="media-playback-bar-controls">
                <p className="media-playback-bar-volume">
                    <IconButton
                        icon={muted ? 'muted' : 'volume'}
                        className="in-frame"
                        title={muted ? 'unmute' : 'mute'}
                        onClick={handleMuteClick}
                    />
                    <Input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={muted ? 0 : volume}
                        onChange={handleVolumeChange}
                        ref={volumeRef}
                    />
                </p>
                <p className="media-playback-bar-buttons">
                    <MediaButton icon="prev" onClick={prev} />
                    <MediaButton icon={paused ? 'play' : 'pause'} onClick={paused ? play : pause} />
                    <MediaButton icon="stop" onClick={stop} />
                    <MediaButton icon="next" onClick={next} />
                </p>
                <p className="media-playback-bar-more">
                    <Button className="media-button media-button-shuffle" onClick={shuffle}>
                        Shuffle
                    </Button>
                </p>
            </div>
        </div>
    );
}
