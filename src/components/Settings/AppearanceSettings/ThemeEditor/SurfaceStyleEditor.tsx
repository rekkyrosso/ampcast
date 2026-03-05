import React, {useCallback, useId, useState} from 'react';
import {SurfaceStyle} from 'types/Theme';
import theme from 'services/theme';
import {IconButton} from 'components/Button';
import useCurrentTheme from '../useCurrentTheme';

interface SurfaceStyleEditorProps {
    surface: 'button' | 'mediaButton' | 'scrollbar';
    parentSurface?: 'button';
}

export default function SurfaceStyleEditor({surface, parentSurface}: SurfaceStyleEditorProps) {
    const id = useId();
    const [surfaceStyle, setSurfaceStyle] = useState(theme[surface].surfaceStyle);
    const currentTheme = useCurrentTheme();
    const lockable = !!parentSurface;
    const locked = lockable && !currentTheme[surface]?.surfaceStyle;

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLSelectElement>) => {
            const surfaceStyle = event.target.value as SurfaceStyle;
            theme[surface] = {...theme.current[surface], surfaceStyle};
            setSurfaceStyle(surfaceStyle);
        },
        [surface]
    );

    const toggleLocked = useCallback(() => {
        const currentSurface = currentTheme[surface];
        if (locked) {
            theme[surface] = {...currentSurface, surfaceStyle};
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {surfaceStyle, ...newSurface} = currentSurface || {};
            theme[surface] = newSurface;
        }
    }, [currentTheme, surface, locked, surfaceStyle]);

    return currentTheme.flat ? null : (
        <p className="surface-style-editor">
            <label htmlFor={`${id}-surface-style`}>Surface:</label>
            <select
                id={`${id}-surface-style`}
                value={theme[surface].surfaceStyle || 'flat'}
                disabled={locked}
                onChange={handleChange}
            >
                <option value="flat">Flat</option>
                <option value="concave">Concave</option>
                <option value="convex">Convex</option>
            </select>
            {lockable ? (
                <IconButton
                    icon={locked ? 'locked' : 'unlocked'}
                    title={locked ? 'Edit' : 'Use button surface style'}
                    onClick={toggleLocked}
                />
            ) : null}
        </p>
    );
}
