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
    const id = useId();

    return (
        <p>
            <label htmlFor={`${id}-${name}`}>{label}:</label>
            <input
                {...props}
                type={type}
                name={name}
                id={`${id}-${name}`}
                spellCheck={false}
                autoCapitalize="off"
                ref={inputRef}
            />
        </p>
    );
}
