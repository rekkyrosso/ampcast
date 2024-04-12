import React, {useCallback} from 'react';
import {Except} from 'type-fest';
import theme, {ThemeColorName} from 'services/theme';

export interface ThemeColorProps
    extends Except<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    colorName: ThemeColorName;
    onChange?: (value: string) => void;
}

export default function ThemeColor({colorName, onChange, ...props}: ThemeColorProps) {
    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const value = event.target.value;
            theme[colorName] = value;
            onChange?.(value);
        },
        [colorName, onChange]
    );

    return <input {...props} type="color" onChange={handleChange} />;
}
