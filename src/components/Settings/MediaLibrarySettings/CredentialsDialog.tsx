import React from 'react';
import MediaService from 'types/MediaService';
import Dialog, {DialogProps, showDialog} from 'components/Dialog';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import MediaServiceCredentials from './MediaServiceCredentials';
import './CredentialsDialog.scss';

export async function showCredentialsDialog(service: MediaService): Promise<void> {
    await showDialog(
        (props: DialogProps) => <CredentialsDialog {...props} service={service} />,
        true
    );
}

export interface CredentialsDialogProps extends DialogProps {
    service: MediaService;
}

export default function CredentialsDialog({service, ...props}: CredentialsDialogProps) {
    return (
        <Dialog
            {...props}
            className="settings-dialog credentials-dialog"
            title={<MediaSourceLabel icon={service.icon} text={`${service.name} Credentials`} />}
        >
            <MediaServiceCredentials service={service} />
        </Dialog>
    );
}
