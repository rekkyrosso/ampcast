import React, {useCallback, useId, useState} from 'react';
import Dialog, {DialogProps} from './Dialog';
import showDialog from './showDialog';

export interface PromptOptions {
    title?: string;
    label?: React.ReactNode;
    buttonLabel?: React.ReactNode;
    value?: string;
}

export default async function prompt({
    title,
    value,
    label,
    buttonLabel,
    system = false,
}: PromptOptions & {system?: boolean}): Promise<string> {
    return showDialog(
        (props: DialogProps) => (
            <PromptDialog
                {...props}
                title={title}
                value={value}
                label={label}
                buttonLabel={buttonLabel}
            />
        ),
        system
    );
}

export type PromptDialogProps = DialogProps & PromptOptions;

export function PromptDialog({
    title = 'Input',
    value: defaultValue = '',
    label,
    buttonLabel = 'OK',
    ...props
}: PromptDialogProps) {
    const id = useId();
    const [value, setValue] = useState(defaultValue);

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
                        defaultValue={defaultValue}
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
                    <button value={value}>{buttonLabel}</button>
                </footer>
            </form>
        </Dialog>
    );
}
