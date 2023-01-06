import React, {useCallback, useLayoutEffect} from 'react';
import theme from 'services/theme';
import prompt from 'components/Dialog/prompt';
import useCurrentTheme from '../useCurrentTheme';
import useSuggestedColors from './useSuggestedColors';
import ThemeColorPicker from './ThemeColorPicker';
import './ThemeEditor.scss';

export default function ThemeEditor() {
    const currentTheme = useCurrentTheme();
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

    const handleSubmit = useCallback(() => theme.save(), []);

    const handleSpacingChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        theme.spacing = event.target.valueAsNumber;
    }, []);

    const handleRoundingChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        theme.roundness = event.target.valueAsNumber;
    }, []);

    const handleFlatChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        theme.flat = event.target.checked;
    }, []);

    const saveAs = useCallback(async () => {
        const name = await prompt('Name', 'Save As', true);
        console.log({name});
    }, []);

    const suggestSelectionColors = useCallback(() => {
        const [backgroundColor, textColor] = suggestedSelectionColors;
        theme.selectedBackgroundColor = backgroundColor;
        theme.selectedTextColor = textColor;
        nextSuggestedSelectionColors();
    }, [suggestedSelectionColors, nextSuggestedSelectionColors]);

    return (
        <form className="theme-editor" method="dialog" onSubmit={handleSubmit}>
            <div className="table-layout">
                <p className="theme-name">
                    <label htmlFor="theme-name">Name:</label>
                    <input
                        type="text"
                        id="theme-name"
                        defaultValue={currentTheme.name}
                        spellCheck={false}
                        readOnly
                    />
                    <button className="small" type="button" onClick={saveAs} disabled>
                        Save As…
                    </button>
                </p>
                <p>
                    <label htmlFor="theme-fontFamily">Font:</label>
                    <select id="theme-fontFamily" disabled>
                        <option>Arial, sans-serif</option>
                    </select>
                </p>
                <p>
                    <label>Frame:</label>
                    <ThemeColorPicker
                        id="frameColor"
                        colorName="frameColor"
                        value={currentTheme.frameColor}
                        title="Frame background color"
                    />
                    <ThemeColorPicker
                        colorName="frameTextColor"
                        value={currentTheme.frameTextColor}
                        title="Frame text color"
                    />
                </p>
                <p>
                    <label>Content:</label>
                    <ThemeColorPicker
                        colorName="backgroundColor"
                        value={currentTheme.backgroundColor}
                        title="Content background color"
                    />
                    <ThemeColorPicker
                        colorName="textColor"
                        value={currentTheme.textColor}
                        title="Content text color"
                    />
                </p>
                <p>
                    <label>Selection:</label>
                    <ThemeColorPicker
                        colorName="selectedBackgroundColor"
                        value={currentTheme.selectedBackgroundColor}
                        title="Selected text background color"
                    />
                    <ThemeColorPicker
                        colorName="selectedTextColor"
                        value={currentTheme.selectedTextColor}
                        title="Selected text color"
                    />
                    <button className="small" type="button" onClick={suggestSelectionColors}>
                        Suggest
                    </button>
                </p>
                <p>
                    <label htmlFor="theme-spacing">Spacing:</label>
                    <input
                        type="range"
                        id="theme-spacing"
                        min={0}
                        max={1}
                        step={0.01}
                        value={currentTheme.spacing}
                        onChange={handleSpacingChange}
                    />
                </p>
                <p>
                    <label htmlFor="theme-roundness">Roundness:</label>
                    <input
                        type="range"
                        id="theme-roundness"
                        min={0}
                        max={1}
                        step={0.01}
                        value={currentTheme.roundness}
                        onChange={handleRoundingChange}
                    />
                </p>
                <p>
                    <label htmlFor="theme-flat">Flat:</label>
                    <input
                        type="checkbox"
                        id="theme-flat"
                        checked={currentTheme.flat}
                        onChange={handleFlatChange}
                    />
                </p>
            </div>
            <footer className="dialog-buttons">
                <button value="#cancel">Cancel</button>
                <button>Confirm</button>
            </footer>
        </form>
    );
}
