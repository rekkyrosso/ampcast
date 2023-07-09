import React from 'react';
import Dialog, {DialogProps} from 'components/Dialog';
import MediaLibrarySettings from './MediaLibrarySettings';
import './MediaLibrarySettingsDialog.scss';

export default function MediaLibrarySettingsDialog(props: DialogProps) {
    return (
        <Dialog
            {...props}
            className="settings-dialog media-library-settings-dialog"
            title="Media Library Settings"
        >
            <MediaLibrarySettings />
        </Dialog>
    );
}
