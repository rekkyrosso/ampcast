import React, {useCallback, useId, useState} from 'react';
import Dialog, {DialogProps} from './Dialog';
import showDialog from './showDialog';
import './prompt.scss';

export interface PromptOptions {
    title?: string;
    label?: React.ReactNode;
    suggestedValue?: string;
    okLabel?: React.ReactNode;
}

export default async function prompt({
    system = false,
    ...props
}: PromptOptions & {system?: boolean}): Promise<string> {
    return showDialog(
        (dialogProps: DialogProps) => <PromptDialog {...dialogProps} {...props} />,
        system
    );
}

export type PromptDialogProps = DialogProps & PromptOptions;

export function PromptDialog({
    title = 'Input',
    label,
    suggestedValue = '',
    okLabel = 'OK',
    ...props
}: PromptDialogProps) {
    const id = useId();
    const [value, setValue] = useState(suggestedValue);

    const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setValue(event.target.value);
    }, []);

    return (
        <Dialog {...props} className="prompt-dialog" title={title}>
            <form method="dialog">
                {label ? (
                    <p className="prompt-message">
                        <label htmlFor={id}>{label}: </label>
                    </p>
                ) : null}
                <p>
                    <input
                        type="text"
                        id={id}
                        defaultValue={suggestedValue}
                        autoFocus
                        spellCheck={false}
                        autoComplete="off"
                        autoCapitalize="off"
                        onChange={handleChange}
                    />
                </p>
                <footer className="dialog-buttons">
                    <button type="button" value="#cancel">
                        Cancel
                    </button>
                    <button value={value}>{okLabel}</button>
                </footer>
            </form>
        </Dialog>
    );
}
