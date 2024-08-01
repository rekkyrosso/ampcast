import React, {useCallback, useId, useState} from 'react';
import Dialog, {DialogProps} from './Dialog';
import DialogButtons from './DialogButtons';
import showDialog from './showDialog';
import './prompt.scss';

export interface PromptOptions {
    title?: React.ReactNode;
    type?: HTMLInputElement['type'];
    placeholder?: HTMLInputElement['placeholder'];
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
    title = 'Input Required',
    type = 'text',
    placeholder = '',
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
                <p>
                    {label ? <label htmlFor={id}>{label}: </label> : null}
                    <input
                        type={type}
                        id={id}
                        defaultValue={suggestedValue}
                        placeholder={placeholder}
                        autoFocus
                        required
                        spellCheck={false}
                        autoComplete="off"
                        autoCapitalize="off"
                        onChange={handleChange}
                    />
                </p>
                <DialogButtons value={value} submitText={okLabel} />
            </form>
        </Dialog>
    );
}
