import React from 'react';
import {Except} from 'type-fest';
import {formatTime} from 'utils';
import {MAX_DURATION} from 'services/constants';

export interface TimeProps extends Except<React.HTMLAttributes<HTMLTimeElement>, 'children'> {
    time: number;
}

export default function Time({time, ...props}: TimeProps) {
    return <time {...props}>{Math.abs(time) >= MAX_DURATION ? '–:––' : formatTime(time)}</time>;
}
