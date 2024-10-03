import React from 'react';
import './ProgressRing.scss';

export interface ProgressRingProps {
    progress: number;
    busy?: boolean;
    error?: boolean;
}

export default function ProgressRing({progress, busy, error}: ProgressRingProps) {
    const radius = 12;
    const strokeWidth = 2;
    const innerRadius = radius - strokeWidth / 2;
    const circumference = innerRadius * 2 * Math.PI;
    const complete = progress === 1;

    if (complete) {
        error = false;
        busy = false;
    }

    return (
        <svg
            className={`progress-ring icon ${
                complete ? 'complete' : error ? 'error' : busy ? 'busy' : ''
            }`}
            viewBox={`0 0 ${2 * radius} ${2 * radius}`}
        >
            <circle
                strokeWidth={strokeWidth}
                fill="none"
                r={innerRadius}
                cx={radius}
                cy={radius}
                opacity={error ? 1 : 0.4}
            />
            <circle
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={(1 - (error ? 0 : busy ? 0.5 : progress)) * circumference}
                strokeWidth={strokeWidth}
                fill={error ? 'red' : 'none'}
                r={innerRadius}
                cx={radius}
                cy={radius}
            />
            {complete ? (
                <path
                    transform="scale(0.75) translate(3,3)"
                    d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                />
            ) : null}
            {error ? (
                <g transform={`rotate(45,${radius},${radius})`} fill="white" stroke="white">
                    <rect
                        x={radius / 2}
                        y={radius - strokeWidth / 2}
                        width={radius}
                        height={strokeWidth}
                        rx="25%"
                    />
                    <rect
                        x={radius - strokeWidth / 2}
                        y={radius / 2}
                        width={strokeWidth}
                        height={radius}
                        rx="25%"
                    />
                </g>
            ) : null}
        </svg>
    );
}
