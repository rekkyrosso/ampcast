import React from 'react';
import {MAX_DURATION} from 'services/constants';
import useCurrentTime from 'hooks/useCurrentTime';
import useDuration from 'hooks/useDuration';
import './ProgressBar.scss';

export default function ProgressBar() {
    const duration = useDuration();
    const currentTime = useCurrentTime();
    return duration === MAX_DURATION ? null : (
        <progress
            className="progress-bar"
            max={duration}
            value={duration === MAX_DURATION ? (currentTime === 0 ? 0 : MAX_DURATION) : currentTime}
        />
    );
}
