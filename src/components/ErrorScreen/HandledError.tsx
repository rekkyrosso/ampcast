import React from 'react';
import './HandledError.scss';

export interface HandledErrorProps {
    error: Error;
}

export default function HandledError({error}: HandledErrorProps) {
    return (
        <div className="panel handled-error">
            <div className="note">
                <p>{error.message}</p>
            </div>
        </div>
    );
}
