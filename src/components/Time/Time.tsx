import React from 'react';
import {formatTime} from 'utils';

export interface TimeProps {
    time: number;
    className?: string;
}

export default function Time({time, className}: TimeProps) {
    return <time className={className}>{formatTime(time)}</time>;
}
