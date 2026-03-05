import React, {useCallback, useId, useState} from 'react';
import {t} from 'services/i18n';
import theme from 'services/theme';
import {IconButton} from 'components/Button';
import useCurrentTheme from '../useCurrentTheme';
import ThemeColor from './ThemeColor';

interface BorderStyleEditorProps {
    surface: 'button' | 'mediaButton' | 'scrollbar';
    parentSurface?: 'button';
}

export default function BorderStyleEditor({surface, parentSurface}: BorderStyleEditorProps) {
    const id = useId();
    const [borderColor, setBorderColor] = useState(theme[surface].borderColor);
    const [borderWidth, setBorderWidth] = useState(theme[surface].borderWidth);
    const currentTheme = useCurrentTheme();
    const lockable = !!parentSurface;
    const locked = lockable && !currentTheme[surface]?.borderColor;

    const handleColorChange = useCallback(
        (borderColor: string) => {
            theme[surface] = {...theme.current[surface], borderColor};
            setBorderColor(borderColor);
        },
        [surface]
    );

    const handleWidthChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const borderWidth = event.target.valueAsNumber;
            theme[surface] = {...theme.current[surface], borderWidth};
            setBorderWidth(borderWidth);
        },
        [surface]
    );

    const toggleLocked = useCallback(() => {
        const currentSurface = currentTheme[surface];
        if (locked) {
            theme[surface] = {...currentSurface, borderColor, borderWidth};
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {borderColor, borderWidth, ...newSurface} = currentSurface || {};
            theme[surface] = newSurface;
        }
    }, [currentTheme, surface, locked, borderColor, borderWidth]);

    return (
        <p className="border-style-editor">
            <label htmlFor={`${id}-border-color`}>Border:</label>
            <ThemeColor
                id={`${id}-border-color`}
                title={t(`Border color`)}
                value={theme[surface].borderColor}
                disabled={locked}
                onChange={handleColorChange}
            />
            <input
                type="range"
                min={0}
                max={6}
                step={0.1}
                value={theme[surface].borderWidth}
                disabled={locked}
                onChange={handleWidthChange}
            />
            {lockable ? (
                <IconButton
                    icon={locked ? 'locked' : 'unlocked'}
                    title={locked ? 'Edit' : 'Use button border style'}
                    onClick={toggleLocked}
                />
            ) : null}
        </p>
    );
}
