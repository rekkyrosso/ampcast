import React from 'react';
import Dialog, {DialogProps} from 'components/Dialog';
import MediaLibrarySettings from './MediaLibrarySettings';

export default function MediaLibrarySettingsDialog(props: DialogProps) {
    return (
        <Dialog {...props} className="media-library-settings-dialog" title="Media Library Settings">
            <MediaLibrarySettings />
        </Dialog>
    );
}
