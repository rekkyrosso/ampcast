import React, {useCallback, useState} from 'react';
import {MediaServiceSettingsGeneralProps} from './MediaServiceSettingsGeneral';
import './DisconnectButton.scss';

export default function DisconnectButton({service}: MediaServiceSettingsGeneralProps) {
    const authService = service.authService || service;
    const [connected, setConnected] = useState(() => authService.isConnected());

    const handleDisconnect = useCallback(async () => {
        await authService.logout();
        setConnected(authService.isConnected());
    }, [authService]);

    return (
        <p>
            <button
                type="button"
                className="disconnect-button"
                onClick={handleDisconnect}
                disabled={!connected}
            >
                {connected ? `Disconnect from ${authService.name}…` : 'Not connected'}
            </button>
        </p>
    );
}
