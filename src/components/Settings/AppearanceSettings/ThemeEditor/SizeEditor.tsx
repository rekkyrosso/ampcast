import React, {useCallback, useId} from 'react';
import theme from 'services/theme';

interface SizeEditorProps extends React.InputHTMLAttributes<HTMLInputElement> {
    surface: 'scrollbar' | 'splitter';
}

export default function SizeEditor({
    surface,
    min = 0.5,
    max = 1.5,
    step = 0.1,
    ...props
}: SizeEditorProps) {
    const id = useId();

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const size = event.target.valueAsNumber;
            theme[surface] = {...theme.current[surface], size};
        },
        [surface]
    );

    return (
        <p className="size-editor">
            <label htmlFor={`${id}-size`}>Size:</label>
            <input
                {...props}
                type="range"
                id={`${id}-size`}
                min={min}
                max={max}
                step={step}
                defaultValue={theme[surface].size}
                onChange={handleChange}
            />
        </p>
    );
}
