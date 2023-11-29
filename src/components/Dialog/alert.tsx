import React from 'react';
import Dialog, {DialogProps} from './Dialog';
import showDialog from './showDialog';
import './alert.scss';

export interface AlertOptions {
    title?: React.ReactNode;
    message: React.ReactNode;
}

export default async function alert({
    title,
    message,
    system = false,
}: AlertOptions & {system?: boolean}): Promise<void> {
    if (typeof message === 'string') {
        message = <p>{message}</p>;
    }
    await showDialog(
        (props: DialogProps) => <AlertDialog {...props} title={title} message={message} />,
        system
    );
}

export type AlertDialogProps = DialogProps & AlertOptions;

export function AlertDialog({message, title = 'Message', ...props}: AlertDialogProps) {
    return (
        <Dialog {...props} className="alert-dialog" title={title}>
            <form method="dialog">
                <div className="alert-message">{message}</div>
                <footer className="dialog-buttons">
                    <button>OK</button>
                </footer>
            </form>
        </Dialog>
    );
}
