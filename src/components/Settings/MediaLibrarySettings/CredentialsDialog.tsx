import React from 'react';
import MediaService from 'types/MediaService';
import Dialog, {DialogProps, showDialog} from 'components/Dialog';
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
            icon={service.icon}
            title={`${service.name} Credentials`}
        >
            <MediaServiceCredentials service={service} />
        </Dialog>
    );
}
