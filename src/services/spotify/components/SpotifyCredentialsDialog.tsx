import React from 'react';
import Dialog, {DialogProps} from 'components/Dialog';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import SpotifyCredentials from './SpotifyCredentials';

export default function SpotifyCredentialsDialog(props: DialogProps) {
    return (
        <Dialog
            {...props}
            className="settings-dialog app-credentials-dialog"
            title={<MediaSourceLabel icon="spotify" text="Spotify Credentials" />}
        >
            <SpotifyCredentials />
        </Dialog>
    );
}
