import React, {useCallback, useMemo, useState} from 'react';
import MediaService from 'types/MediaService';
import Pin from 'types/Pin';
import pinStore from 'services/pins/pinStore';
import DialogButtons from 'components/Dialog/DialogButtons';
import ListBox from 'components/ListView/ListBox';
import './PinnedSettings.scss';

export interface PinnedSettingsProps {
    service: MediaService;
}

export default function PinnedSettings({service}: PinnedSettingsProps) {
    const renderPin = useMemo(() => (pin: Pin) => pin.title, []);
    const [pins, setPins] = useState(() => pinStore.getPinsForService(service.id));
    const [selectedPins, setSelectedPins] = useState<readonly Pin[]>([]);

    const handleSubmit = useCallback(async () => {
        const originalPins = pinStore.getPinsForService(service.id);
        const pinsToRemove = originalPins.filter(
            (originalPin) => pins.findIndex((pin) => pin.src === originalPin.src) === -1
        );
        const shouldUnlock = pinsToRemove.some((pin) => pinStore.isLocked(pin.src));
        if (shouldUnlock) {
            pinStore.unlock();
        }
        await pinStore.unpin(pinsToRemove);
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
            <DialogButtons />
        </form>
    );
}
