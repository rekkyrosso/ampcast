import React, {useCallback, useEffect, useRef} from 'react';
import {fromEvent, throttleTime} from 'rxjs';
import {browser, clamp} from 'utils';
import playbackSettings from 'services/mediaPlayback/playbackSettings';
import IconButton from 'components/Button/IconButton';
import usePlaybackSettings from 'hooks/usePlaybackSettings';
import {MediaControlsProps} from './MediaControls';

export default function VolumeControl({overlay}: MediaControlsProps) {
    const ref = useRef<HTMLDivElement | null>(null);
    const volumeRef = useRef<HTMLInputElement | null>(null);
    const {volume, muted} = usePlaybackSettings();
    const volumeLabel = volume <= 0.33 ? 'low' : volume <= 0.67 ? 'medium' : 'high';
    const isMuted = muted || volume === 0;

    const handleVolumeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const volume = event.target.valueAsNumber;
        playbackSettings.volume = volume;
        playbackSettings.muted = volume === 0;
    }, []);

    const handleMuteClick = useCallback(() => {
        const {volume, muted} = playbackSettings;
        playbackSettings.volume = muted ? volume || 0.1 : volume;
        playbackSettings.muted = !muted;
    }, []);

    const handleWheel = useCallback((event: WheelEvent) => {
        if (!event[browser.cmdKey]) {
            const currentVolume = volumeRef.current!.valueAsNumber;
            const volume = clamp(0, currentVolume - Math.sign(event.deltaY) * 0.05, 1);
            playbackSettings.volume = volume;
            playbackSettings.muted = volume === 0;
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
                icon={isMuted ? 'muted' : 'volume'}
                className="in-frame"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                title={isMuted ? 'unmute' : 'mute'}
                tabIndex={overlay ? -1 : undefined}
                onClick={handleMuteClick}
            />
            <input
                type="range"
                aria-label="Volume"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                tabIndex={overlay ? -1 : undefined}
                onChange={handleVolumeChange}
                ref={volumeRef}
            />
        </div>
    );
}
