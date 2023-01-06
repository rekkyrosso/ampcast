import React, {useCallback, useLayoutEffect, useMemo} from 'react';
import theme, {themes} from 'services/theme';

export default function AppearanceSettingsGeneral() {
    const initialFontSize = useMemo(() => theme.fontSize, []);

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

    const handleFontSizeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        theme.fontSize = event.target.valueAsNumber;
    }, []);

    return (
        <form className="theme-settings" method="dialog" onSubmit={handleSubmit}>
            <div className="table-layout">
                <p>
                    <label htmlFor="theme-name">Theme:</label>
                    <select id="theme-name" onChange={handlePresetChange} defaultValue={theme.name}>
                        {themes.map(({name}) => (
                            <option value={name} key={name}>
                                {name || '(boring default)'}
                            </option>
                        ))}
                    </select>
                </p>
                <p className="font-size">
                    <label htmlFor="theme-fontSize">Font Size:</label>
                    <input
                        type="range"
                        id="theme-fontSize"
                        min={12}
                        max={28}
                        step={0.4}
                        defaultValue={initialFontSize}
                        onChange={handleFontSizeChange}
                        key={initialFontSize}
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
