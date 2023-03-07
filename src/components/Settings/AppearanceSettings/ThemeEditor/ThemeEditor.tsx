import React, {useCallback, useId, useLayoutEffect} from 'react';
import theme from 'services/theme';
import ThemeColorPair from './ThemeColorPair';
import useCurrentTheme from '../useCurrentTheme';
import useSuggestedColors from './useSuggestedColors';
import saveTheme from './saveTheme';
import './ThemeEditor.scss';

export default function ThemeEditor() {
    const id = useId();
    const currentTheme = useCurrentTheme();
    const themeName = `${currentTheme.name}${theme.edited ? ' (edited)' : ''}`;
    const themeKey = `${!!currentTheme.userTheme}/${currentTheme.name}`;
    const [suggestedSelectionColors, nextSuggestedSelectionColors] = useSuggestedColors(
        currentTheme.frameColor
    );

    useLayoutEffect(() => {
        // Lock `font-size` for this dialog.
        const systemStyle = document.getElementById('system')!.style;
        systemStyle.setProperty('--font-size', String(theme.fontSize));
        return () => {
            theme.restore();
            systemStyle.removeProperty('--font-size');
        };
    }, []);

    const handleSubmit = useCallback(() => {
        theme.save();
    }, []);

    const handleSaveAsClick = useCallback(() => {
        saveTheme(currentTheme.name);
    }, [currentTheme]);

    const handleSpacingChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        theme.spacing = event.target.valueAsNumber;
    }, []);

    const handleRoundingChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        theme.roundness = event.target.valueAsNumber;
    }, []);

    const handleFlatChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        theme.flat = event.target.checked;
    }, []);

    return (
        <form className="theme-editor" method="dialog" onSubmit={handleSubmit}>
            <div className="table-layout">
                <p className="theme-name">
                    <label htmlFor={`${id}-theme-name`}>Name:</label>
                    <input
                        type="text"
                        id={`${id}-theme-name`}
                        value={themeName}
                        spellCheck={false}
                        readOnly
                        tabIndex={-1}
                    />
                    <button className="small" type="button" onClick={handleSaveAsClick}>
                        Save as…
                    </button>
                </p>
                <ThemeColorPair
                    label="Frame"
                    backgroundColorName="frameColor"
                    textColorName="frameTextColor"
                    key={`${themeKey}/frame`}
                />
                <ThemeColorPair
                    label="Content"
                    backgroundColorName="backgroundColor"
                    textColorName="textColor"
                    key={`${themeKey}/content`}
                />
                <ThemeColorPair
                    label="Selection"
                    backgroundColorName="selectedBackgroundColor"
                    textColorName="selectedTextColor"
                    suggestedColors={suggestedSelectionColors}
                    nextSuggestion={nextSuggestedSelectionColors}
                    key={`${themeKey}/selection`}
                />
                <ThemeColorPair
                    label="Media button"
                    backgroundColorName="mediaButtonColor"
                    textColorName="mediaButtonTextColor"
                    defaultBackgroundColor={theme.defaultMediaButtonColor}
                    defaultTextColor={theme.defaultMediaButtonTextColor}
                    key={`${themeKey}/media-button`}
                />
                <ThemeColorPair
                    label="Button"
                    backgroundColorName="buttonColor"
                    textColorName="buttonTextColor"
                    defaultBackgroundColor={theme.defaultButtonColor}
                    defaultTextColor={theme.defaultButtonTextColor}
                    key={`${themeKey}/button`}
                />
                <ThemeColorPair
                    label="Scrollbar"
                    backgroundColorName="scrollbarColor"
                    textColorName="scrollbarTextColor"
                    defaultBackgroundColor={theme.defaultScrollbarColor}
                    defaultTextColor={theme.defaultScrollbarTextColor}
                    trackingColor="button"
                    key={`${themeKey}/scrollbar`}
                />
                <p>
                    <label htmlFor={`${id}-theme-spacing`}>Spacing:</label>
                    <input
                        type="range"
                        id={`${id}-theme-spacing`}
                        min={0}
                        max={1}
                        step={0.01}
                        value={currentTheme.spacing}
                        onChange={handleSpacingChange}
                    />
                </p>
                <p>
                    <label htmlFor={`${id}-theme-roundness`}>Roundness:</label>
                    <input
                        type="range"
                        id={`${id}-theme-roundness`}
                        min={0}
                        max={1}
                        step={0.01}
                        value={currentTheme.roundness}
                        onChange={handleRoundingChange}
                    />
                </p>
                <p>
                    <label htmlFor={`${id}-theme-flat`}>Flat:</label>
                    <input
                        type="checkbox"
                        id={`${id}-theme-flat`}
                        checked={currentTheme.flat}
                        onChange={handleFlatChange}
                    />
                </p>
            </div>
            <footer className="dialog-buttons">
                <button type="button" value="#cancel">
                    Cancel
                </button>
                <button>Confirm</button>
            </footer>
        </form>
    );
}
