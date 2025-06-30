import React from 'react';
import MediaService from 'types/MediaService';
import Dialog, {DialogProps, showDialog} from 'components/Dialog';
import MediaServiceSettings from './MediaServiceSettings';
import './MediaServiceSettingsDialog.scss';

export async function showMediaServiceSettingsDialog(service: MediaService): Promise<void> {
    await showDialog(
        (props: DialogProps) => <MediaServiceSettingsDialog {...props} service={service} />,
        true
    );
}

export interface MediaServiceSettingsDialogProps extends DialogProps {
    service: MediaService;
}

export default function MediaServiceSettingsDialog({
    service,
    ...props
}: MediaServiceSettingsDialogProps) {
    return (
        <Dialog
            {...props}
            className="settings-dialog media-services-settings-dialog"
            icon={service.icon}
            title={`${service.name} Settings`}
        >
            <MediaServiceSettings service={service} />
        </Dialog>
    );
}
