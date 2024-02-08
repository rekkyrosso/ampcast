import React from 'react';
import Dialog, {DialogProps} from 'components/Dialog';
import SpotifyCredentials from './SpotifyCredentials';

export default function SpotifyCredentialsDialog(props: DialogProps) {
    return (
        <Dialog
            {...props}
            className="settings-dialog spotify-credentials-dialog"
            title="Spotify Credentials"
        >
            <SpotifyCredentials />
        </Dialog>
    );
}
