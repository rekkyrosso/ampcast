import React from 'react';
import Dialog, {DialogProps} from 'components/Dialog';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import YouTubeCredentials from './YouTubeCredentials';

export default function YouTubeCredentialsDialog(props: DialogProps) {
    return (
        <Dialog
            {...props}
            className="settings-dialog app-credentials-dialog"
            title={<MediaSourceLabel icon="google-cloud" text="Google Credentials" />}
        >
            <YouTubeCredentials />
        </Dialog>
    );
}
