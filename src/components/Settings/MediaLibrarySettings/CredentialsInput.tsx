import React, {useCallback, useEffect, useId, useRef, useState} from 'react';
import {Except} from 'type-fest';
import Button from 'components/Button';
import {confirm, prompt} from 'components/Dialog';
import './CredentialsInput.scss';

export type CredentialsInputProps = Except<
    React.InputHTMLAttributes<HTMLInputElement>,
    'onChange'
> & {
    label: string;
    defaultValue?: string;
    locked?: boolean;
    secret?: boolean;
    onChange?: (value: string) => void;
};

export default function CredentialsInput({
    locked,
    secret,
    name = '',
    className = '',
    defaultValue = '',
    autoFocus,
    label,
    onChange,
    ...props
}: CredentialsInputProps) {
    const ref = useRef<HTMLInputElement>(null);
    const uid = useId();
    const id = `${uid}-${name}`;
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        if (!locked && !secret && autoFocus) {
            // https://github.com/facebook/react/issues/23301
            ref.current?.setAttribute('autofocus', 'true');
        }
    }, [locked, secret, autoFocus, ref]);

    const enterSecret = useCallback(async () => {
        const newValue = await prompt({
            icon: 'key',
            title: 'Credentials',
            label,
            required: false,
            okLabel: 'Save',
            system: true,
        });
        if (newValue !== undefined && newValue !== value) {
            if (newValue === '') {
                const confirmed = await confirm({
                    icon: 'key',
                    title: 'Credentials',
                    message: `Reset ${label}?`,
                    system: true,
                });
                if (!confirmed) {
                    return;
                }
            }
            setValue(newValue);
            onChange?.(newValue);
        }
    }, [label, value, onChange]);

    const handleInput = useCallback(
        (event: React.InputEvent) => {
            setValue(event.data);
            onChange?.(event.data);
        },
        [onChange]
    );

    return (
        <p className="credentials-input">
            <label htmlFor={secret ? undefined : id}>{label}:</label>
            {secret ? (
                <span className="credentials-input-secret">
                    <span
                        className={`secret ${className} ${locked ? 'locked' : ''}`}
                        onClick={locked ? undefined : enterSecret}
                    >
                        {value.replaceAll(/./g, '●').slice(0, locked ? 40 : 32) || '\u00A0'}
                    </span>
                    {locked ? null : (
                        <Button type="button" onClick={enterSecret}>
                            Edit…
                        </Button>
                    )}
                </span>
            ) : (
                <input
                    {...props}
                    className={`${className} ${locked ? 'locked' : ''}`}
                    type="text"
                    name={name}
                    id={id}
                    defaultValue={defaultValue}
                    readOnly={locked}
                    spellCheck={false}
                    autoComplete="off"
                    autoCapitalize="off"
                    onInput={handleInput}
                    ref={ref}
                />
            )}
        </p>
    );
}
