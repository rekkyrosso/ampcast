import React from 'react';
import {Except} from 'type-fest';
import {formatTime} from 'utils';

export interface TimeProps extends Except<React.HTMLAttributes<HTMLTimeElement>, 'children'> {
    time: number;
}

export default function Time({time, ...props}: TimeProps) {
    return <time {...props}>{formatTime(time)}</time>;
}
