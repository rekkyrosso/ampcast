import React, {useCallback, useState} from 'react';
import MediaService from 'types/MediaService';
import Pin from 'types/Pin';
import pinStore from 'services/pins/pinStore';
import {confirm} from 'components/Dialog';
import DialogButtons from 'components/Dialog/DialogButtons';
import ListBox from 'components/ListView/ListBox';
import usePinsForService from './usePinsForService';
import './PinnedSettings.scss';

export interface PinnedSettingsProps {
    service: MediaService;
}

export default function PinnedSettings({service}: PinnedSettingsProps) {
    const pins = usePinsForService(service);
    const renderPin = useCallback((pin: Pin) => pin.title, []);
    const [[selectedPin], setSelectedPins] = useState<readonly Pin[]>([]);

    const handleRemoveClick = useCallback(async () => {
        if (selectedPin) {
            const confirmed = await confirm({
                icon: 'pin',
                title: 'Pins',
                message: 'Unpin this playlist?',
                okLabel: 'Unpin',
                storageId: 'delete-pin',
                system: true,
            });
            if (confirmed) {
                await pinStore.unpin(selectedPin);
            }
        }
    }, [selectedPin]);

    return (
        <form className="pinned-settings" method="dialog">
            <h3>Pinned playlists:</h3>
            <ListBox<Pin>
                title="Pinned playlists"
                items={pins}
                itemKey="src"
                renderItem={renderPin}
                onDelete={handleRemoveClick}
                onSelect={setSelectedPins}
            />
            <p className="pinned-settings-buttons">
                <button type="button" disabled={!selectedPin} onClick={handleRemoveClick}>
                    Remove
                </button>
            </p>
            <DialogButtons />
        </form>
    );
}
