import React, {useCallback, useId, useEffect, useMemo, useRef} from 'react';
import {TinyColor} from '@ctrl/tinycolor';
import {partition} from 'utils';
import theme from 'services/theme';
import themeStore from 'services/theme/themeStore';
import DialogButtons from 'components/Dialog/DialogButtons';
import useCurrentTheme from './useCurrentTheme';
import useDefaultThemes from './useDefaultThemes';
import useUserThemes from './useUserThemes';
import './AppearanceSettingsGeneral.scss';

export default function AppearanceSettingsGeneral() {
    const id = useId();
    const currentTheme = useCurrentTheme();
    const darkThemesRef = useRef<HTMLSelectElement>(null);
    const lightThemesRef = useRef<HTMLSelectElement>(null);
    const lightThemeRef = useRef<HTMLInputElement>(null);
    const userThemesRef = useRef<HTMLSelectElement>(null);
    const userThemeRef = useRef<HTMLInputElement>(null);
    const initialFontSize = useMemo(() => theme.fontSize, []);
    const defaultThemes = useDefaultThemes();
    const userThemes = useUserThemes();
    const isUserTheme = !!currentTheme.userTheme;
    const isLightTheme = new TinyColor(currentTheme.backgroundColor).isLight();
    const isDarkTheme = !isLightTheme;
    const [lightThemes, darkThemes] = partition(defaultThemes, (theme) =>
        new TinyColor(theme.backgroundColor).isLight()
    );

    useEffect(() => {
        // Lock `font-size` for this dialog.
        const systemStyle = document.getElementById('system')!.style;
        systemStyle.setProperty('--font-size', String(theme.fontSize));
        return () => {
            theme.load();
            systemStyle.removeProperty('--font-size');
        };
    }, []);

    const handleSubmit = useCallback(() => theme.save(), []);

    const handleThemeChange = useCallback(() => {
        const newTheme = userThemeRef.current!.checked
            ? themeStore.getUserTheme(userThemesRef.current!.value)
            : lightThemeRef.current!.checked
            ? themeStore.getDefaultTheme(lightThemesRef.current!.value)
            : themeStore.getDefaultTheme(darkThemesRef.current!.value);
        if (newTheme) {
            theme.apply(newTheme);
        }
    }, []);

    const handleFontSizeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        theme.fontSize = event.target.valueAsNumber;
    }, []);

    return (
        <form className="appearance-settings-general" method="dialog" onSubmit={handleSubmit}>
            <fieldset>
                <legend>Theme</legend>
                <div className="table-layout">
                    <p>
                        <input
                            type="radio"
                            name="theme-source"
                            id={`${id}-dark-themes`}
                            value="dark"
                            checked={isDarkTheme && !isUserTheme}
                            onChange={handleThemeChange}
                        />
                        <label htmlFor={`${id}-dark-themes`}>Dark themes:</label>
                        <select
                            value={isUserTheme || isLightTheme ? undefined : currentTheme.name}
                            disabled={isUserTheme || isLightTheme}
                            onChange={handleThemeChange}
                            ref={darkThemesRef}
                        >
                            {darkThemes.map(({name}) => (
                                <option value={name} key={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </p>
                    <p>
                        <input
                            type="radio"
                            name="theme-source"
                            id={`${id}-light-themes`}
                            value="light"
                            checked={isLightTheme && !isUserTheme}
                            onChange={handleThemeChange}
                            ref={lightThemeRef}
                        />
                        <label htmlFor={`${id}-light-themes`}>Light themes:</label>
                        <select
                            value={isUserTheme || isDarkTheme ? undefined : currentTheme.name}
                            disabled={isUserTheme || isDarkTheme}
                            onChange={handleThemeChange}
                            ref={lightThemesRef}
                        >
                            {lightThemes.map(({name}) => (
                                <option value={name} key={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </p>
                    <p>
                        <input
                            type="radio"
                            name="theme-source"
                            id={`${id}-user-themes`}
                            value="user"
                            checked={isUserTheme}
                            disabled={userThemes.length === 0}
                            onChange={handleThemeChange}
                            ref={userThemeRef}
                        />
                        <label htmlFor={`${id}-user-themes`}>My themes:</label>
                        <select
                            value={isUserTheme ? currentTheme.name : undefined}
                            onChange={handleThemeChange}
                            disabled={!isUserTheme}
                            ref={userThemesRef}
                        >
                            {userThemes.map(({name}) => (
                                <option value={name} key={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
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
                            step={0.2}
                            defaultValue={initialFontSize}
                            onChange={handleFontSizeChange}
                        />
                    </p>
                </div>
            </fieldset>

            <DialogButtons />
        </form>
    );
}
