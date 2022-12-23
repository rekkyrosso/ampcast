import React, {memo} from 'react';
import './SunClock.scss';

/**
 * This is an attempt to visualise the time of day.
 * The daytime is bright and the night is dark.
 * The sun rises in the morning and it sets in the evening.
 * I hope that's clear. :)
 */

export interface SunClockProps {
    time: number | string;
}

export default memo(function SunClock({time}: SunClockProps) {
    const unit = 100 / 6;
    const date = new Date(time);
    let hour = date.getHours() + date.getMinutes() / 60;
    let am = Math.min(hour, 6);
    let pm = hour - am;
    if (hour > 12) {
        hour = 24 - hour;
        pm = Math.min(hour, 6);
        am = hour - pm;
    }
    return (
        <span
            role="presentation"
            className="sun-clock"
            title={date.toLocaleTimeString()}
            style={
                {
                    '--am-alpha': `${am * unit}%`,
                    '--pm-alpha': `${pm * unit}%`,
                } as React.CSSProperties
            }
        />
    );
});
