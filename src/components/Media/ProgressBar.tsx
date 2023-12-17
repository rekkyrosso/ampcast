import React from 'react';
import {observeCurrentTime, observeDuration} from 'services/mediaPlayback';
import useObservable from 'hooks/useObservable';
import './ProgressBar.scss';

export default function ProgressBar() {
    const duration = useObservable(observeDuration, 0);
    const currentTime = useObservable(observeCurrentTime, 0);
    return <progress className="progress-bar" max={duration} value={currentTime} />;
}
