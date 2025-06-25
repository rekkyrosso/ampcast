import React from 'react';
import MediaService from 'types/MediaService';
import Dialog, {DialogProps, showDialog} from 'components/Dialog';
import MediaServiceSettingsGeneral from 'components/Settings/MediaLibrarySettings/MediaServiceSettingsGeneral';
import './EditSourcesDialog.scss';

export async function showEditSourcesDialog(service: MediaService): Promise<void> {
    await showDialog(
        (props: DialogProps) => <EditSourcesDialog {...props} service={service} />,
        true
    );
}

export interface CredentialsDialogProps extends DialogProps {
    service: MediaService;
}

export default function EditSourcesDialog({service, ...props}: CredentialsDialogProps) {
    return (
        <Dialog
            {...props}
            className="edit-sources-dialog"
            icon={service.icon}
            title={`${service.name}: Sources`}
        >
            <MediaServiceSettingsGeneral service={service} />
        </Dialog>
    );
}
