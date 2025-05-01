import React from 'react';
import useCurrentTime from 'hooks/useCurrentTime';
import useDuration from 'hooks/useDuration';
import './ProgressBar.scss';

export default function ProgressBar() {
    const duration = useDuration();
    const currentTime = useCurrentTime();
    return <progress className="progress-bar" max={duration} value={currentTime} />;
}
