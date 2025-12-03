import React, {useEffect, useId} from 'react';

export type CredentialsInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    locked?: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
};

export default function CredentialsInput({
    locked,
    type = locked ? 'password' : 'text',
    name = '',
    autoFocus,
    label,
    inputRef,
    ...props
}: CredentialsInputProps) {
    const uid = useId();
    const id = `${uid}-${name}`;

    useEffect(() => {
        if (!locked && autoFocus) {
            // https://github.com/facebook/react/issues/23301
            inputRef.current?.setAttribute('autofocus', 'true');
        }
    }, [locked, autoFocus, inputRef]);

    return (
        <p>
            <label htmlFor={id}>{label}:</label>
            <input
                {...props}
                type={type}
                name={name}
                id={id}
                readOnly={locked}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                ref={inputRef}
            />
        </p>
    );
}
