import React, {useCallback} from 'react';
import useFonts from './useFonts';

export type FontSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> &
    React.RefAttributes<HTMLSelectElement> & {
        allowEmpty?: boolean;
        emptyText?: string;
    };

export default function FontSelect({
    className = '',
    defaultValue = '',
    allowEmpty,
    emptyText = '(none)',
    onChange,
    ...props
}: FontSelectProps) {
    const fonts = useFonts();

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLSelectElement>) => {
            onChange?.(event);
        },
        [onChange]
    );

    return (
        <select
            {...props}
            className={`font-select ${className}`}
            defaultValue={defaultValue}
            onChange={handleChange}
        >
            {allowEmpty ? <option value="">{emptyText}</option> : null}
            {fonts.map(({name, value, loaded}) => (
                <option
                    value={name}
                    disabled={loaded === false}
                    style={{fontFamily: value}}
                    key={name}
                >
                    {name}
                </option>
            ))}
        </select>
    );
}
