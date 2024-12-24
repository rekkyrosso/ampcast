import React, {useId} from 'react';

export type CredentialsProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
};

export default function Credentials({
    type = 'text',
    name = '',
    label,
    inputRef,
    ...props
}: CredentialsProps) {
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
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                ref={inputRef}
            />
        </p>
    );
}
