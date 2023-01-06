import React from 'react';
import Dialog, {DialogProps} from './Dialog';
import showDialog from './showDialog';

export default async function confirm(
    message: React.ReactNode,
    title?: string,
    system?: boolean
): Promise<boolean> {
    if (typeof message === 'string') {
        message = <p>{message}</p>;
    }
    const result = await showDialog(
        (props: DialogProps) => <ConfirmDialog {...props} title={title} message={message} />,
        system
    );
    return result === 'confirmed';
}

export interface ConfirmDialogProps extends DialogProps {
    title?: string;
    message: React.ReactNode;
}

export function ConfirmDialog({message, title = 'Confirm', ...props}: ConfirmDialogProps) {
    return (
        <Dialog {...props} className="confirm-dialog" title={title}>
            <form method="dialog">
                <div className="confirm-message">{message}</div>
                <footer className="dialog-buttons">
                    <button value="#cancel">Cancel</button>
                    <button value="confirmed">Confirm</button>
                </footer>
            </form>
        </Dialog>
    );
}
