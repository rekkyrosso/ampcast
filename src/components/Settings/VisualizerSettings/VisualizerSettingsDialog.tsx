import React from 'react';
import Dialog, {DialogProps} from 'components/Dialog';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import VisualizerSettings from './VisualizerSettings';

export default function VisualizerSettingsDialog(props: DialogProps) {
    return (
        <Dialog
            {...props}
            className="settings-dialog visualizer-settings-dialog"
            title={<MediaSourceLabel icon="settings" text="Visualizer Settings" />}
        >
            <VisualizerSettings />
        </Dialog>
    );
}
