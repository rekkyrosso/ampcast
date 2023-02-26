import React, {useCallback, useId, useRef} from 'react';
import {LiteStorage} from 'utils';
import Dialog, {DialogProps} from './Dialog';
import showDialog from './showDialog';
import './confirm.scss';

const storage = new LiteStorage('confirm');

export interface ConfirmOptions {
    title?: string;
    message: React.ReactNode;
    buttonLabel?: React.ReactNode;
    storageId?: string;
}

export default async function confirm({
    title,
    message,
    buttonLabel,
    storageId,
    system = false,
}: ConfirmOptions & {system?: boolean}): Promise<boolean> {
    if (storageId && storage.getBoolean(storageId)) {
        return true;
    }
    if (typeof message === 'string') {
        message = <p>{message}</p>;
    }
    const result = await showDialog(
        (props: DialogProps) => (
            <ConfirmDialog
                {...props}
                title={title}
                message={message}
                buttonLabel={buttonLabel}
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
    buttonLabel = 'OK',
    message,
    storageId,
    ...props
}: ConfirmDialogProps) {
    const id = useId();
    const storageRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback(() => {
        if (storageId && storageRef.current!.checked) {
            storage.setBoolean(storageId, true);
        }
    }, [storageId]);

    return (
        <Dialog {...props} className="confirm-dialog" title={title}>
            <form method="dialog" onSubmit={handleSubmit}>
                <div className="confirm-message">{message}</div>
                <footer className="dialog-buttons">
                    <button type="button" value="#cancel">
                        Cancel
                    </button>
                    <button value="confirmed">{buttonLabel}</button>
                </footer>
                {storageId ? (
                    <footer className="confirm-dialog-storage">
                        <input id={id} type="checkbox" ref={storageRef} />
                        <label htmlFor={id}>Don&apos;t show this message again.</label>
                    </footer>
                ) : null}
            </form>
        </Dialog>
    );
}
