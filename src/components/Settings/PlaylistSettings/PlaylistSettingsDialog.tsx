import React from 'react';
import Dialog, {DialogProps} from 'components/Dialog';
import PlaylistSettings from './PlaylistSettings';

export default function PlaylistSettingsDialog(props: DialogProps) {
    return (
        <Dialog {...props} className="playlist-settings-dialog" title="Playlist Settings">
            <PlaylistSettings />
        </Dialog>
    );
}
