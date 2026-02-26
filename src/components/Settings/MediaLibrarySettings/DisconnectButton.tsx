import React, {useCallback, useState} from 'react';
import Button from 'components/Button';
import {MediaServiceSettingsGeneralProps} from './MediaServiceSettingsGeneral';

export default function DisconnectButton({service}: MediaServiceSettingsGeneralProps) {
    const [connected, setConnected] = useState(() => service.isConnected());

    const handleDisconnect = useCallback(async () => {
        await service.logout();
        setConnected(service.isConnected());
    }, [service]);

    return (
        <p>
            <Button
                type="button"
                className="disconnect-button"
                onClick={handleDisconnect}
                disabled={!connected}
            >
                {connected ? `Disconnect from ${service.name}` : 'Not connected'}
            </Button>
        </p>
    );
}
