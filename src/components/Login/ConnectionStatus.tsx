import React, {useEffect, useState} from 'react';
import {LoginProps} from './Login';
import './ConnectionStatus.scss';

export default function ConnectionStatus({service}: LoginProps) {
    const [messages, setMessages] = useState<string[]>([]);

    useEffect(() => {
        if (service.observeConnectionStatus) {
            const subscription = service.observeConnectionStatus().subscribe((message) => {
                if (message) {
                    setMessages((messages) => messages.concat(message));
                } else {
                    // Use an empty string to flush the message list.
                    setMessages([]);
                }
            });
            return () => subscription.unsubscribe();
        } else {
            setMessages([]);
        }
    }, [service]);

    return (
        <div className="connection-status">
            {messages.map((message, index) => (
                <p key={index}>{message}</p>
            ))}
        </div>
    );
}
