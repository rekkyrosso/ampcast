import React from 'react';
import Dialog, {DialogProps} from 'components/Dialog';
import VisualizerSettings from './VisualizerSettings';

export default function VisualizerSettingsDialog(props: DialogProps) {
    return (
        <Dialog
            {...props}
            className="settings-dialog visualizer-settings-dialog"
            icon="settings"
            title="Visualizer Settings"
        >
            <VisualizerSettings />
        </Dialog>
    );
}
