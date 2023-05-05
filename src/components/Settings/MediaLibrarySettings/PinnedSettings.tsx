import React, {useCallback, useMemo, useState} from 'react';
import Pin from 'types/Pin';
import pinStore from 'services/pins/pinStore';
import ListBox from 'components/ListView/ListBox';
import {MediaServiceSettingsProps} from './MediaServiceSettings';
import './PinnedSettings.scss';

export default function PinnedSettings({service}: MediaServiceSettingsProps) {
    const renderPin = useMemo(() => (pin: Pin) => pin.title, []);
    const [pins, setPins] = useState(() => pinStore.getPinsForService(service.id));
    const [selectedPins, setSelectedPins] = useState<readonly Pin[]>([]);

    const handleSubmit = useCallback(async () => {
        const originalPins = pinStore.getPinsForService(service.id);
        await pinStore.unpin(
            originalPins.filter(
                (originalPin) => pins.findIndex((pin) => pin.src === originalPin.src) === -1
            )
        );
    }, [service, pins]);

    const handleRemoveClick = useCallback(() => {
        const selectedSrcs = selectedPins.map((pin) => pin.src);
        setPins((pins) => pins.filter((pin) => !selectedSrcs.includes(pin.src)));
        setSelectedPins([]);
    }, [selectedPins]);

    return (
        <form className="pinned-settings" method="dialog" onSubmit={handleSubmit}>
            <h3>Pinned playlists:</h3>
            <ListBox<Pin>
                title="Pinned playlists"
                items={pins}
                itemKey="src"
                multiple
                renderItem={renderPin}
                onDelete={handleRemoveClick}
                onSelect={setSelectedPins}
            />
            <p className="pinned-settings-buttons">
                <button
                    type="button"
                    disabled={selectedPins.length === 0}
                    onClick={handleRemoveClick}
                >
                    Remove
                </button>
            </p>
            <footer className="dialog-buttons">
                <button type="button" value="#cancel">
                    Cancel
                </button>
                <button>Confirm</button>
            </footer>
        </form>
    );
}
