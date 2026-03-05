import React, {useCallback} from 'react';
import {Except} from 'type-fest';

export interface ThemeColorProps extends Except<
    React.InputHTMLAttributes<HTMLInputElement>,
    'onChange'
> {
    onChange: (value: string) => void;
}

export default function ThemeColor({onChange, ...props}: ThemeColorProps) {
    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            onChange(event.target.value);
        },
        [onChange]
    );

    return <input {...props} type="color" onChange={handleChange} />;
}
