import React, {useCallback, useState} from 'react';
import theme, {ThemeColorName} from 'services/theme';
import IconButton from 'components/Button/IconButton';
import useCurrentTheme from '../useCurrentTheme';
import ThemeColor from './ThemeColor';

export interface ThemeColorPairProps {
    label: string;
    backgroundColorName: ThemeColorName;
    textColorName: ThemeColorName;
    defaultBackgroundColor?: string;
    defaultTextColor?: string;
    suggestedColors?: [string, string];
    nextSuggestion?: () => void;
    trackingColor?: string;
    children?: React.ReactNode;
}

export default function ThemeColorPair({
    label,
    backgroundColorName,
    textColorName,
    defaultBackgroundColor,
    defaultTextColor,
    suggestedColors,
    nextSuggestion,
    trackingColor = 'frame',
    children,
}: ThemeColorPairProps) {
    const currentTheme = useCurrentTheme();
    const lockable = defaultBackgroundColor && defaultTextColor;
    const backgroundColor = currentTheme[backgroundColorName];
    const textColor = currentTheme[textColorName];
    const [originalBackgroundColor, setOriginalBackgroundColor] = useState(
        () => backgroundColor || defaultBackgroundColor || ''
    );
    const [originalTextColor, setOriginalTextColor] = useState(
        () => textColor || defaultTextColor || ''
    );
    const locked = !backgroundColor && !textColor;

    const suggest = useCallback(() => {
        if (suggestedColors && nextSuggestion) {
            const [backgroundColor, textColor] = suggestedColors;
            theme[backgroundColorName] = backgroundColor;
            theme[textColorName] = textColor;
            nextSuggestion();
        }
    }, [backgroundColorName, textColorName, suggestedColors, nextSuggestion]);

    const toggleLocked = useCallback(() => {
        if (locked) {
            theme[backgroundColorName] = originalBackgroundColor;
            theme[textColorName] = originalTextColor;
        } else {
            theme[backgroundColorName] = '';
            theme[textColorName] = '';
        }
    }, [locked, backgroundColorName, textColorName, originalBackgroundColor, originalTextColor]);

    const swap = useCallback(() => {
        const backgroundColor = theme[backgroundColorName];
        const textColor = theme[textColorName];
        theme[backgroundColorName] = textColor;
        theme[textColorName] = backgroundColor;
    }, [backgroundColorName, textColorName]);

    return (
        <p className={`color-pair ${locked ? 'locked' : ''}`}>
            <label>{label}:</label>
            <ThemeColor
                colorName={backgroundColorName}
                value={backgroundColor || defaultBackgroundColor}
                title={`${label} background color`}
                disabled={locked}
                onChange={setOriginalBackgroundColor}
            />
            <IconButton icon="swap" title="Swap" onClick={swap} disabled={locked} />
            <ThemeColor
                colorName={textColorName}
                value={textColor || defaultTextColor}
                title={`${label} text color`}
                disabled={locked}
                onChange={setOriginalTextColor}
            />
            {lockable ? (
                <IconButton
                    icon={locked ? 'locked' : 'unlocked'}
                    title={locked ? 'Allow editing' : `Lock to ${trackingColor} color`}
                    onClick={toggleLocked}
                />
            ) : null}
            {suggestedColors && nextSuggestion ? (
                <button className="small" type="button" onClick={suggest}>
                    Suggest
                </button>
            ) : null}
            {children}
        </p>
    );
}
