import React, {useId, useRef, useState} from 'react';
import {IconName} from 'components/Icon';
import Dialog, {DialogProps} from './Dialog';
import DialogButtons from './DialogButtons';
import showDialog from './showDialog';
import './select.scss';

export interface SelectProps {
    icon?: IconName;
    title?: string;
    message?: React.ReactNode;
    options: Record<string, string>;
    suggestedValue?: string;
    okLabel?: React.ReactNode;
}

export default async function select({
    system = false,
    ...props
}: SelectProps & {system?: boolean}): Promise<string> {
    return showDialog(
        (dialogProps: DialogProps) => <SelectDialog {...dialogProps} {...props} />,
        system
    );
}

export type SelectDialogProps = DialogProps & SelectProps;

export function SelectDialog({
    title = 'Select',
    options,
    message,
    suggestedValue,
    okLabel = 'Confirm',
    ...props
}: SelectDialogProps) {
    const id = useId();
    const ref = useRef<HTMLFormElement>(null);
    const initialValue = suggestedValue || Object.keys(options)[0] || ''
    const [value, setValue] = useState(() => initialValue);

    if (typeof message === 'string') {
        message = <p>{message}</p>;
    } else if (Array.isArray(message)) {
        message = message.map((text, i) => <p key={i}>{text}</p>);
    }

    return (
        <Dialog {...props} className="select-dialog" title={title}>
            <form method="dialog" ref={ref}>
                {message}
                <ul>
                    {Object.keys(options).map((key) => (
                        <li key={key}>
                            <input
                                type="radio"
                                name={id}
                                id={`${id}-${key}`}
                                value={key}
                                defaultChecked={key === initialValue}
                                onChange={() => setValue(key)}
                            />
                            <label htmlFor={`${id}-${key}`}>{options[key]}</label>
                        </li>
                    ))}
                </ul>
                <DialogButtons value={value} submitText={okLabel} />
            </form>
        </Dialog>
    );
}
