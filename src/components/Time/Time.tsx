import React from 'react';
import {Except} from 'type-fest';
import {formatDuration, formatTime} from 'utils';
import {MAX_DURATION} from 'services/constants';

export interface TimeProps extends Except<React.HTMLAttributes<HTMLTimeElement>, 'children'> {
    time: number;
    asDuration?: boolean;
}

export default function Time({time, asDuration, ...props}: TimeProps) {
    const format = asDuration ? formatDuration : formatTime;
    return <time {...props}>{Math.abs(time || 0) >= MAX_DURATION ? '–:––' : format(time)}</time>;
}
