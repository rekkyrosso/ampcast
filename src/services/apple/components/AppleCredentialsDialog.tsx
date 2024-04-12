import React from 'react';
import Dialog, {DialogProps} from 'components/Dialog';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import AppleCredentials from './AppleCredentials';

export default function AppleCredentialsDialog(props: DialogProps) {
    return (
        <Dialog
            {...props}
            className="settings-dialog app-credentials-dialog"
            title={<MediaSourceLabel icon="apple-logo" text="Apple Developer Credentials" />}
        >
            <AppleCredentials />
        </Dialog>
    );
}
