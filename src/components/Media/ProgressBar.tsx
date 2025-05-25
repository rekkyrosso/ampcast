import React from 'react';
import useCurrentTime from 'hooks/useCurrentTime';
import useDuration from 'hooks/useDuration';
import {MAX_DURATION} from 'services/constants';
import './ProgressBar.scss';

export default function ProgressBar() {
    const duration = useDuration();
    const currentTime = useCurrentTime();
    return (
        <progress
            className="progress-bar"
            max={duration}
            value={duration === MAX_DURATION ? (currentTime === 0 ? 0 : MAX_DURATION) : currentTime}
        />
    );
}
