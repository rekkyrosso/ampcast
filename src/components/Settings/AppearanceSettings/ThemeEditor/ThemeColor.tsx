import React, {useCallback} from 'react';
import {ConditionalKeys, Except} from 'type-fest';
import theme, {CurrentTheme} from 'services/theme';

export interface ThemeColorProps
    extends Except<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    colorName: ConditionalKeys<CurrentTheme, string>;
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
