import React, {useCallback, useRef} from 'react';
import {setHiddenSources} from 'services/servicesSettings';
import Dialog, {DialogProps} from 'components/Dialog';
import MediaLibrarySettingsGeneral from './MediaLibrarySettingsGeneral';
import './MediaServiceSelectionDialog.scss';

export default function MediaServiceSelectionDialog(props: DialogProps) {
    const servicesRef = useRef<HTMLFormElement>(null);

    // TODO: Code duplication.
    const handleSubmit = useCallback(() => {
        const inputs = servicesRef.current!.elements as HTMLInputElements;
        const settings: Record<string, boolean> = {};
        for (const input of inputs) {
            if (input.type === 'checkbox') {
                settings[input.value] = !input.checked;
            }
        }
        setHiddenSources(settings);
    }, []);

    return (
        <Dialog
            {...props}
            className="settings-dialog media-service-selection-dialog"
            title="Media Service Selection"
        >
            <p>Select any services you are interested in.</p>
            <MediaLibrarySettingsGeneral servicesRef={servicesRef} onSubmit={handleSubmit} />
        </Dialog>
    );
}
