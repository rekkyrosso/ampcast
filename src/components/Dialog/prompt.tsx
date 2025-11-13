import React, {useCallback, useId, useState} from 'react';
import {IconName} from 'components/Icon';
import Dialog, {DialogProps} from './Dialog';
import DialogButtons from './DialogButtons';
import showDialog from './showDialog';
import './prompt.scss';

export interface PromptProps {
    icon?: IconName;
    title?: string;
    message?: React.ReactNode;
    type?: HTMLInputElement['type'] | 'textarea';
    placeholder?: string;
    label?: React.ReactNode;
    suggestedValue?: string;
    okLabel?: React.ReactNode;
}

export default async function prompt({
    system = false,
    ...props
}: PromptProps & {system?: boolean}): Promise<string> {
    return showDialog(
        (dialogProps: DialogProps) => <PromptDialog {...dialogProps} {...props} />,
        system
    );
}

export type PromptDialogProps = DialogProps & PromptProps;

export function PromptDialog({
    title = 'Input Required',
    type = 'text',
    message,
    placeholder = '',
    label,
    suggestedValue = '',
    okLabel = 'OK',
    ...props
}: PromptDialogProps) {
    const id = useId();
    const [value, setValue] = useState(suggestedValue);

    if (typeof message === 'string') {
        message = <p>{message}</p>;
    } else if (Array.isArray(message)) {
        message = message.map((text, i) => <p key={i}>{text}</p>);
    }

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setValue(event.target.value);
        },
        []
    );

    const inputProps: React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> = {
        id,
        defaultValue: suggestedValue,
        placeholder,
        autoFocus: true,
        required: true,
        spellCheck: false,
        autoComplete: 'off',
        autoCapitalize: 'off',
        onChange: handleChange,
    };

    return (
        <Dialog {...props} className="prompt-dialog" title={title}>
            <form method="dialog">
                {message}
                <p>
                    {label ? <label htmlFor={id}>{label}: </label> : null}
                    {type === 'textarea' ? <textarea {...inputProps} /> : <input {...inputProps} />}
                </p>
                <DialogButtons value={value} submitText={okLabel} />
            </form>
        </Dialog>
    );
}
