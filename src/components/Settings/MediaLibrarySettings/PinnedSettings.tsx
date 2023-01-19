import React, {useCallback, useRef, useState} from 'react';
import pinStore from 'services/pins/pinStore';
import {MediaServiceSettingsProps} from './MediaServiceSettings';

export default function PinnedSettings({service}: MediaServiceSettingsProps) {
    const pinsRef = useRef<HTMLSelectElement>(null);
    const [pins, setPins] = useState(() => pinStore.getPinsForService(service.id));

    const handleSubmit = useCallback(async () => {
        const originalPins = pinStore.getPinsForService(service.id);
        await pinStore.unpin(
            originalPins.filter(
                (originalPin) => pins.findIndex((pin) => pin.src === originalPin.src) === -1
            )
        );
    }, [service, pins]);

    const handleRemoveClick = useCallback(() => {
        const selectedSrcs = Array.from(pinsRef.current!.selectedOptions).map(
            (option) => option.value
        );
        setPins((pins) => pins.filter((pin) => !selectedSrcs.includes(pin.src)));
    }, []);

    return (
        <form className="pinned-settings" method="dialog" onSubmit={handleSubmit}>
            <p>
                <label htmlFor="pinned-playlists">Pinned playlists:</label>
                <select id="pinned-playlists" multiple size={8} ref={pinsRef}>
                    {pins.map((pin) => (
                        <option value={pin.src} key={pin.src}>
                            {pin.title}
                        </option>
                    ))}
                </select>
            </p>
            <p>
                <button type="button" onClick={handleRemoveClick}>
                    Remove
                </button>
            </p>
            <footer className="dialog-buttons">
                <button value="#cancel">Cancel</button>
                <button>Confirm</button>
            </footer>
        </form>
    );
}
