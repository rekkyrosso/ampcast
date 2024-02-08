import React from 'react';
import Dialog, {DialogProps} from 'components/Dialog';
import YouTubeCredentials from './YouTubeCredentials';

export default function YouTubeCredentialsDialog(props: DialogProps) {
    return (
        <Dialog
            {...props}
            className="settings-dialog youtube-credentials-dialog"
            title="YouTube Credentials"
        >
            <YouTubeCredentials />
        </Dialog>
    );
}
