import React, {useId} from 'react';

export type CredentialsInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    locked?: boolean;
    inputRef?: React.RefObject<HTMLInputElement | null>;
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

    return (
        <p>
            <label htmlFor={id}>{label}:</label>
            <input
                {...props}
                type={type}
                name={name}
                id={id}
                autoFocus={locked ? false : autoFocus} // TODO: This doesn't actually work.
                readOnly={locked}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                ref={inputRef}
            />
        </p>
    );
}
