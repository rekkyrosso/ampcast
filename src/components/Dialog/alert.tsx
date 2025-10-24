import React from 'react';
import {IconName} from 'components/Icon';
import Dialog, {DialogProps} from './Dialog';
import showDialog from './showDialog';
import './alert.scss';

export interface AlertOptions {
    icon?: IconName;
    title?: string;
    message: React.ReactNode;
}

export default async function alert({
    title = 'Message',
    system = false,
    ...props
}: AlertOptions & {system?: boolean}): Promise<void> {
    await showDialog(
        (dialogProps: DialogProps) => <AlertDialog {...dialogProps} {...props} title={title} />,
        system
    );
}

export type AlertDialogProps = DialogProps & AlertOptions;

export function AlertDialog({message, ...props}: AlertDialogProps) {
    if (typeof message === 'string') {
        message = <p>{message}</p>;
    } else if (Array.isArray(message)) {
        message = message.map((text, i) => <p key={i}>{text}</p>);
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
