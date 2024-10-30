import React, {useCallback, useId, useRef} from 'react';
import {LiteStorage} from 'utils';
import Dialog, {DialogProps} from './Dialog';
import DialogButtons from './DialogButtons';
import showDialog from './showDialog';
import './confirm.scss';

const storage = new LiteStorage('confirm');

export interface ConfirmOptions {
    title?: React.ReactNode;
    message: React.ReactNode;
    okLabel?: React.ReactNode;
    storageId?: string;
}

export default async function confirm({
    title,
    message,
    okLabel,
    storageId,
    system = false,
}: ConfirmOptions & {system?: boolean}): Promise<boolean> {
    if (storageId && storage.getBoolean(storageId)) {
        return true;
    }
    const result = await showDialog(
        (props: DialogProps) => (
            <ConfirmDialog
                {...props}
                title={title}
                message={message}
                okLabel={okLabel}
                storageId={storageId}
            />
        ),
        system
    );
    return result === 'confirmed';
}

export type ConfirmDialogProps = DialogProps & ConfirmOptions;

export function ConfirmDialog({
    title = 'Confirm',
    message,
    okLabel = 'Confirm',
    storageId,
    ...props
}: ConfirmDialogProps) {
    const id = useId();
    const storageRef = useRef<HTMLInputElement>(null);
    if (typeof message === 'string') {
        message = <p>{message}</p>;
    }

    const handleSubmit = useCallback(() => {
        if (storageId && storageRef.current!.checked) {
            storage.setBoolean(storageId, true);
        }
    }, [storageId]);

    return (
        <Dialog {...props} className="confirm-dialog" title={title}>
            <form method="dialog" onSubmit={handleSubmit}>
                <div className="confirm-message">{message}</div>
                <DialogButtons value="confirmed" submitText={okLabel} />
                {storageId ? (
                    <footer className="confirm-dialog-storage">
                        <input id={id} type="checkbox" ref={storageRef} />
                        <label htmlFor={id}>Don&apos;t show this message again</label>
                    </footer>
                ) : null}
            </form>
        </Dialog>
    );
}
