import React, {useId} from 'react';

export type AppCredentialProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    inputRef: React.RefObject<HTMLInputElement>;
};

export default function AppCredential({
    type = 'text',
    name = '',
    label,
    inputRef,
    ...props
}: AppCredentialProps) {
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
