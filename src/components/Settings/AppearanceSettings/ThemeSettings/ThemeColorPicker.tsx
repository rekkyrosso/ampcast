import React, {useCallback} from 'react';
import {ConditionalKeys} from 'type-fest';
import Theme from 'types/Theme';
import theme from 'services/theme';
import Input from 'components/Input';

export interface ThemeColorPickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
    colorName: ConditionalKeys<Theme, string>;
}

export default function ThemeColorPicker({colorName, ...props}: ThemeColorPickerProps) {
    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            theme[colorName] = event.target.value;
        },
        [colorName]
    );

    return <Input {...props} type="color" onChange={handleChange} />;
}
