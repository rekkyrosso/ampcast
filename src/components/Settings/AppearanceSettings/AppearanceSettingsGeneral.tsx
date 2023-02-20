import React, {useCallback, useLayoutEffect, useMemo} from 'react';
import theme from 'services/theme';
import themeStore from 'services/theme/themeStore';
import useDefaultThemes from './useDefaultThemes';
import useUserThemes from './useUserThemes';

export default function AppearanceSettingsGeneral() {
    const initialTheme = useMemo(() => theme.current.name, []);
    const initialFontSize = useMemo(() => theme.fontSize, []);
    const defaultThemes = useDefaultThemes();
    const userThemes = useUserThemes();

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

    const handleThemeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        theme.load(event.target.value);
    }, []);

    const handleFontSizeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        theme.fontSize = event.target.valueAsNumber;
    }, []);

    return (
        <form className="theme-settings" method="dialog" onSubmit={handleSubmit}>
            <fieldset>
                <legend>Theme</legend>
                <div className="table-layout">
                    <p>
                        <input
                            type="radio"
                            name="theme-source"
                            id="default-themes"
                            defaultChecked={themeStore.isDefaultTheme(initialTheme)}
                        />
                        <label htmlFor="default-themes">Default themes:</label>
                        {defaultThemes.length === 0 ? null : (
                            <select onChange={handleThemeChange} defaultValue={initialTheme}>
                                {defaultThemes.map(({name}) => (
                                    <option value={name} key={name}>
                                        {name || '(boring default)'}
                                    </option>
                                ))}
                            </select>
                        )}
                    </p>
                    <p>
                        <input
                            type="radio"
                            name="theme-source"
                            id="user-themes"
                            defaultChecked={!themeStore.isDefaultTheme(initialTheme)}
                            disabled={userThemes.length === 0}
                        />
                        <label htmlFor="user-themes">My themes:</label>
                        {userThemes.length === 0 ? null : (
                            <select
                                onChange={handleThemeChange}
                                defaultValue={initialTheme}
                                disabled={userThemes.length === 0}
                            >
                                {userThemes.map(({name}) => (
                                    <option value={name} key={name}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </p>
                </div>
            </fieldset>

            <fieldset>
                <legend>Preferences</legend>
                <div className="table-layout">
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
            </fieldset>

            <footer className="dialog-buttons">
                <button value="#cancel">Cancel</button>
                <button>Confirm</button>
            </footer>
        </form>
    );
}
