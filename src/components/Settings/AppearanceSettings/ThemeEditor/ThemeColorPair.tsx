import React, {useCallback, useState} from 'react';
import {ConditionalKeys} from 'type-fest';
import theme, {CurrentTheme} from 'services/theme';
import IconButton from 'components/Button/IconButton';
import useCurrentTheme from '../useCurrentTheme';
import ThemeColor from './ThemeColor';

type ColorName = ConditionalKeys<CurrentTheme, string>;

export interface ThemeColorPairProps {
    label: string;
    backgroundColorName: ColorName;
    textColorName: ColorName;
    defaultBackgroundColor?: string;
    defaultTextColor?: string;
    suggestedColors?: [string, string];
    nextSuggestion?: () => void;
    trackingColor?: string;
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
            <IconButton
                icon="swap"
                title="Swap"
                onClick={swap}
                disabled={locked}
            />
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
        </p>
    );
}
