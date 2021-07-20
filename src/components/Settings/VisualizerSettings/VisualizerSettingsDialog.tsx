import React from 'react';
import Dialog, {DialogProps} from 'components/Dialog';
import VisualizerSettings from './VisualizerSettings';

export default function VisualizerSettingsDialog(props: DialogProps) {
    return (
        <Dialog {...props} className="visualizer-settings-dialog" title="Visualizer Settings">
            <VisualizerSettings />
        </Dialog>
    );
}
