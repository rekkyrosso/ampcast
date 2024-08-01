import React from 'react';
import {IconName} from 'components/Icon';
import Dialog, {DialogProps} from './Dialog';
import showDialog from './showDialog';
import './alert.scss';

export interface AlertOptions {
    icon?: IconName;
    title?: React.ReactNode;
    message: React.ReactNode;
}

export default async function alert({
    icon,
    title = 'Message',
    message,
    system = false,
}: AlertOptions & {system?: boolean}): Promise<void> {
    await showDialog(
        (props: DialogProps) => (
            <AlertDialog {...props} icon={icon} title={title} message={message} />
        ),
        system
    );
}

export type AlertDialogProps = DialogProps & AlertOptions;

export function AlertDialog({message, ...props}: AlertDialogProps) {
    if (typeof message === 'string') {
        message = <p>{message}</p>;
    }
    return (
        <Dialog {...props} className="alert-dialog">
            <form method="dialog">
                <div className="alert-message">{message}</div>
                <footer className="dialog-buttons">
                    <button>OK</button>
                </footer>
            </form>
        </Dialog>
    );
}
