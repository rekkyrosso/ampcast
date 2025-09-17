import React from 'react';
import MediaService from 'types/MediaService';
import Dialog, {DialogProps, showDialog} from 'components/Dialog';
import MediaServicePins from './MediaServicePins';

export async function showMediaServicePinsDialog(service: MediaService): Promise<void> {
    await showDialog(
        (props: DialogProps) => <MediaServicePinsDialog {...props} service={service} />,
        true
    );
}

export interface CredentialsDialogProps extends DialogProps {
    service: MediaService;
}

export default function MediaServicePinsDialog({service, ...props}: CredentialsDialogProps) {
    return (
        <Dialog
            {...props}
            className="settings-dialog media-service-pins-dialog"
            icon={service.icon}
            title={`${service.name}: Pins`}
        >
            <MediaServicePins service={service} isolated />
        </Dialog>
    );
}
