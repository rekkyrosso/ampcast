import React, {memo, useCallback, useEffect, useRef, useState} from 'react';
import {fromEvent, throttleTime} from 'rxjs';
import {browser, clamp} from 'utils';
import mediaPlayback from 'services/mediaPlayback';
import IconButton from 'components/Button/IconButton';
import './VolumeControl.scss';

export default memo(function VolumeControl() {
    const ref = useRef<HTMLDivElement | null>(null);
    const volumeRef = useRef<HTMLInputElement | null>(null);
    const [muted, setMuted] = useState(() => mediaPlayback.muted);
    const [volume, setVolume] = useState(() => mediaPlayback.volume);
    const volumeLabel = volume <= 0.33 ? 'low' : volume <= 0.67 ? 'medium' : 'high';

    useEffect(() => {
        mediaPlayback.muted = muted;
    }, [muted]);

    useEffect(() => {
        mediaPlayback.volume = volume;
    }, [volume]);

    const handleVolumeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const volume = event.target.valueAsNumber;
        setVolume(volume);
        setMuted(volume === 0);
    }, []);

    const handleMuteClick = useCallback(() => {
        setVolume((volume) => (muted ? volume || 0.1 : volume));
        setMuted(!muted);
    }, [muted]);

    const handleWheel = useCallback((event: WheelEvent) => {
        if (!event[browser.cmdKey]) {
            const currentVolume = volumeRef.current!.valueAsNumber;
            const volume = clamp(0, currentVolume - Math.sign(event.deltaY) * 0.05, 1);
            setVolume(volume);
            setMuted(volume === 0);
        }
    }, []);

    useEffect(() => {
        const container = ref.current;
        if (container) {
            const subscription = fromEvent<WheelEvent>(container, 'wheel', {passive: true})
                .pipe(throttleTime(60))
                .subscribe(handleWheel);
            return () => subscription.unsubscribe();
        }
    }, [handleWheel]);

    return (
        <div className={`volume-control volume-${volumeLabel}`} ref={ref}>
            <IconButton
                icon={muted ? 'muted' : 'volume'}
                className="in-frame"
                aria-label={muted ? 'Unmute' : 'Mute'}
                title={muted ? 'unmute' : 'mute'}
                onClick={handleMuteClick}
            />
            <input
                type="range"
                aria-label="Volume"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                ref={volumeRef}
            />
        </div>
    );
});
