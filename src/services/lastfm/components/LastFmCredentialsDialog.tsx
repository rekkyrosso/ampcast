import React from 'react';
import Dialog, {DialogProps} from 'components/Dialog';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import LastFmCredentials from './LastFmCredentials';

export default function LastFmCredentialsDialog(props: DialogProps) {
    return (
        <Dialog
            {...props}
            className="settings-dialog app-credentials-dialog"
            title={<MediaSourceLabel icon="lastfm" text="last.fm Credentials" />}
        >
            <LastFmCredentials />
        </Dialog>
    );
}
