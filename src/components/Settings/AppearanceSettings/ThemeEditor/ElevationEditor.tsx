import React, {useCallback, useId, useState} from 'react';
import theme from 'services/theme';
import {IconButton} from 'components/Button';
import useCurrentTheme from '../useCurrentTheme';

interface ElevationEditorProps extends React.InputHTMLAttributes<HTMLInputElement> {
    surface: 'button' | 'mediaButton';
    parentSurface?: 'button';
}

export default function ElevationEditor({
    surface,
    parentSurface,
    min = 0,
    max = 2,
    step = 0.1,
    ...props
}: ElevationEditorProps) {
    const id = useId();
    const [elevation, setElevation] = useState(theme[surface].elevation);
    const currentTheme = useCurrentTheme();
    const lockable = !!parentSurface;
    const locked = lockable && currentTheme[surface]?.elevation === undefined;

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const elevation = event.target.valueAsNumber;
            theme[surface] = {...theme.current[surface], elevation};
            setElevation(elevation);
        },
        [surface]
    );

    const toggleLocked = useCallback(() => {
        const currentSurface = currentTheme[surface];
        if (locked) {
            theme[surface] = {...currentSurface, elevation};
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {elevation, ...newSurface} = currentSurface || {};
            theme[surface] = newSurface;
        }
    }, [currentTheme, surface, locked, elevation]);

    return currentTheme.flat ? null : (
        <p className="elevation-editor">
            <label htmlFor={`${id}-elevation`}>Elevation:</label>
            <input
                {...props}
                type="range"
                id={`${id}-elevation`}
                min={min}
                max={max}
                step={step}
                value={theme[surface].elevation}
                disabled={locked}
                onChange={handleChange}
            />
            {lockable ? (
                <IconButton
                    icon={locked ? 'locked' : 'unlocked'}
                    title={locked ? 'Edit' : 'Use button elevation'}
                    onClick={toggleLocked}
                />
            ) : null}
        </p>
    );
}
