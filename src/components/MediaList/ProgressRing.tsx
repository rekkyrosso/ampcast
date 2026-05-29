import React from 'react';
import './ProgressRing.scss';

export interface ProgressRingProps {
    progress: number;
    busy?: boolean;
    error?: unknown;
}

export default function ProgressRing({progress, busy, error}: ProgressRingProps) {
    const radius = 12;
    const strokeWidth = 4;
    const innerRadius = radius - strokeWidth / 2;
    const circumference = innerRadius * 2 * Math.PI;
    const complete = progress === 1;

    return (
        <svg
            className={`progress-ring icon ${busy ? 'busy' : error ? 'error' : complete ? 'complete' : ''}`}
            viewBox={`0 0 ${2 * radius} ${2 * radius}`}
        >
            <circle
                strokeWidth={strokeWidth}
                fill="none"
                r={innerRadius}
                cx={radius}
                cy={radius}
                opacity={(error || complete) && !busy ? 1 : 0.4}
            />
            <circle
                className="progress-ring-bg"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={
                    (1 - (busy ? 0.5 : error || complete ? 0 : progress)) * circumference
                }
                strokeWidth={2}
                r={innerRadius}
                cx={radius}
                cy={radius}
            />
            {error && !busy ? (
                <g transform={`rotate(45,${radius},${radius})`} fill="white" stroke="white">
                    <rect x={radius / 2} y={radius - 1} width={radius} height={2} rx="25%" />
                    <rect x={radius - 1} y={radius / 2} width={2} height={radius} rx="25%" />
                </g>
            ) : complete && !busy ? (
                <path
                    fill="white"
                    stroke="white"
                    transform="scale(0.67) translate(5,5)"
                    d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                    strokeWidth={2}
                />
            ) : null}
        </svg>
    );
}
