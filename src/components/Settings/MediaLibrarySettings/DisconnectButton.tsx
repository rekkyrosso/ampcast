import React, {useCallback, useState} from 'react';
import {MediaServiceSettingsGeneralProps} from './MediaServiceSettingsGeneral';
import './DisconnectButton.scss';

export default function DisconnectButton({service}: MediaServiceSettingsGeneralProps) {
    const [connected, setConnected] = useState(() => service.isConnected());

    const handleDisconnect = useCallback(async () => {
        await service.logout();
        setConnected(service.isConnected());
    }, [service]);

    return (
        <p>
            <button
                type="button"
                className="disconnect-button"
                onClick={handleDisconnect}
                disabled={!connected}
            >
                {connected ? `Disconnect from ${service.name}…` : 'Not connected'}
            </button>
        </p>
    );
}
