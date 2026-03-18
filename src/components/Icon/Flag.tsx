import React from 'react';

export interface FlagProps {
    country: string;
}

export default function Flag({country}: FlagProps) {
    return country ? (
        <img
            className="icon icon-flag"
            src={`https://cdnjs.cloudflare.com/ajax/libs/flag-icons/7.5.0/flags/4x3/${country.toLowerCase()}.svg`}
        />
    ) : null;
}
