import React, {useCallback, useId, useRef} from 'react';
import {LiteStorage} from 'utils';
import {IconName} from 'components/Icon';
import Dialog, {DialogProps} from './Dialog';
import DialogButtons from './DialogButtons';
import showDialog from './showDialog';
import './confirm.scss';

const storage = new LiteStorage('confirm');

export interface ConfirmProps {
    icon?: IconName;
    title?: string;
    message: React.ReactNode;
    okLabel?: React.ReactNode;
    storageId?: string;
    storagePrompt?: string;
}

export default async function confirm({
    storageId,
    system = false,
    ...props
}: ConfirmProps & {system?: boolean}): Promise<boolean> {
    if (storageId && storage.getBoolean(storageId)) {
        return true;
    }
    const result = await showDialog(
        (dialogProps: DialogProps) => (
            <ConfirmDialog {...dialogProps} {...props} storageId={storageId} />
        ),
        system
    );
    return result === 'confirmed';
}

export type ConfirmDialogProps = DialogProps & ConfirmProps;

export function ConfirmDialog({
    title = 'Confirm',
    message,
    okLabel = 'Confirm',
    storageId,
    storagePrompt = "Don't show this message again",
    ...props
}: ConfirmDialogProps) {
    const id = useId();
    const storageRef = useRef<HTMLInputElement>(null);
    if (typeof message === 'string') {
        message = <p>{message}</p>;
    } else if (Array.isArray(message)) {
        message = message.map((text, i) => <p key={i}>{text}</p>);
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
                        <label htmlFor={id}>{storagePrompt}</label>
                    </footer>
                ) : null}
            </form>
        </Dialog>
    );
}

export function removeConfirmation(storageId: string): void {
    storage.removeItem(storageId);
}
