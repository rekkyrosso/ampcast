import React, {memo, useCallback, useEffect, useState} from 'react';
import mediaPlayback from 'services/mediaPlayback';
import IconButton from 'components/Button/IconButton';
import './VolumeControl.scss';

export default memo(function VolumeControl() {
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

    return (
        <div className={`volume-control volume-${volumeLabel}`}>
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
            />
        </div>
    );
});
