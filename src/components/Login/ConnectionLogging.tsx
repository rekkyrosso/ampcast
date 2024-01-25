import React, {useEffect, useState} from 'react';
import {LoginProps} from './Login';
import './ConnectionLogging.scss';

export default function ConnectionLogging({service: {observeConnectionLogging}}: LoginProps) {
    const [entries, setEntries] = useState<string[]>([]);

    useEffect(() => {
        if (observeConnectionLogging) {
            const subscription = observeConnectionLogging().subscribe((entry) => {
                if (entry) {
                    setEntries((entries) => entries.concat(entry));
                } else {
                    // Use an empty string to flush the log.
                    setEntries([]);
                }
            });
            return () => subscription.unsubscribe();
        } else {
            setEntries([]);
        }
    }, [observeConnectionLogging]);

    return observeConnectionLogging ? (
        <div className="connection-logging">
            {entries.map((entry, index) => (
                <p key={index}>{entry}</p>
            ))}
        </div>
    ) : null;
}
