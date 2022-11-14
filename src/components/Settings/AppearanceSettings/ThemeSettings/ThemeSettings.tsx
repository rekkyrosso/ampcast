import React, {useCallback, useLayoutEffect, useMemo} from 'react';
import theme from 'services/theme';
import presets from 'services/theme/themes/presets';
import Button from 'components/Button';
import Input from 'components/Input';
import ThemeColorPicker from './ThemeColorPicker';
import useCurrentTheme from './useCurrentTheme';
import './ThemeSettings.scss';

export default function ThemeSettings() {
    const initialFontSize = useMemo(() => theme.fontSize, []);
    const currentTheme = useCurrentTheme();

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

    const handlePresetChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        theme.load(event.target.value);
    }, []);

    const handleSpacingChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        theme.spacing = event.target.valueAsNumber;
    }, []);

    const handleFontSizeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        theme.fontSize = event.target.valueAsNumber;
    }, []);

    const handleRoundingChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        theme.roundness = event.target.valueAsNumber;
    }, []);

    const handleFlatChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        theme.flat = event.target.checked;
    }, []);

    return (
        <form className="theme-settings" method="dialog" onSubmit={handleSubmit}>
            <fieldset>
                <legend>
                    <label htmlFor="theme-name">Name:</label>
                    <select id="theme-name" onChange={handlePresetChange} value={theme.name}>
                        {presets.map(({name}) => (
                            <option value={name} key={name}>
                                {name || '(none)'}
                            </option>
                        ))}
                    </select>
                </legend>
                <div className="table-layout">
                    <p>
                        <label htmlFor="theme-fontFamily">Font:</label>
                        <select id="theme-fontFamily">
                            <option>Arial, sans-serif</option>
                        </select>
                    </p>
                    <p>
                        <label>Frame:</label>
                        <ThemeColorPicker
                            id="frameColor"
                            colorName="frameColor"
                            value={currentTheme.frameColor}
                            title="Frame background"
                        />
                        <ThemeColorPicker
                            colorName="frameTextColor"
                            value={currentTheme.frameTextColor}
                            title="Frame text"
                        />
                    </p>
                    <p>
                        <label>Content:</label>
                        <ThemeColorPicker
                            colorName="backgroundColor"
                            value={currentTheme.backgroundColor}
                            title="Content background"
                        />
                        <ThemeColorPicker
                            colorName="textColor"
                            value={currentTheme.textColor}
                            title="Content text"
                        />
                    </p>
                    <p>
                        <label htmlFor="theme-spacing">Spacing:</label>
                        <Input
                            type="range"
                            id="theme-spacing"
                            min={0}
                            max={1}
                            step={0.03125}
                            value={currentTheme.spacing}
                            onChange={handleSpacingChange}
                        />
                    </p>
                    <p>
                        <label htmlFor="theme-roundness">Roundness:</label>
                        <Input
                            type="range"
                            id="theme-roundness"
                            min={0}
                            max={1}
                            step={0.03125}
                            value={currentTheme.roundness}
                            onChange={handleRoundingChange}
                        />
                    </p>
                    <p>
                        <label htmlFor="theme-flat">Flat:</label>
                        <Input
                            type="checkbox"
                            id="theme-flat"
                            checked={currentTheme.flat}
                            onChange={handleFlatChange}
                        />
                    </p>
                </div>
                <p className="dialog-buttons">
                    <Button className="small" type="button" disabled>
                        Save…
                    </Button>
                </p>
            </fieldset>
            <div className="table-layout font-size">
                <p>
                    <label htmlFor="theme-fontSize">Font Size:</label>
                    <Input
                        type="range"
                        id="theme-fontSize"
                        min={12}
                        max={32}
                        step={1}
                        defaultValue={initialFontSize}
                        onChange={handleFontSizeChange}
                        key={initialFontSize}
                    />
                </p>
            </div>
            <footer className="dialog-buttons">
                <Button value="#cancel">Cancel</Button>
                <Button>Confirm</Button>
            </footer>
        </form>
    );
}
