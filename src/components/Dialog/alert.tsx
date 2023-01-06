import React from 'react';
import Dialog, {DialogProps} from './Dialog';
import showDialog from './showDialog';

export default async function alert(
    message: React.ReactNode,
    title?: string,
    system?: boolean
): Promise<void> {
    if (typeof message === 'string') {
        message = <p>{message}</p>;
    }
    await showDialog(
        (props: DialogProps) => <AlertDialog {...props} title={title} message={message} />,
        system
    );
}

export interface AlertDialogProps extends DialogProps {
    title?: string;
    message: React.ReactNode;
}

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
