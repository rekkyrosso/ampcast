import React, {useCallback, useId, useEffect} from 'react';
import theme from 'services/theme';
import fonts, {loadAllFonts} from 'services/theme/fonts';
import Button from 'components/Button';
import {DialogButtons} from 'components/Dialog';
import ButtonEditor from './ButtonEditor';
import MediaButtonEditor from './MediaButtonEditor';
import ScrollbarEditor from './ScrollbarEditor';
import SplitterEditor from './SplitterEditor';
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
    const [suggestedColors, nextSuggestion] = useSuggestedColors(currentTheme.frame.color);

    useEffect(() => {
        loadAllFonts();
    }, []);

    const handleSubmit = useCallback(() => {
        theme.save();
    }, []);

    const handleSaveAsClick = useCallback(() => {
        saveTheme(currentTheme.name);
    }, [currentTheme]);

    const handleFontChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        theme.fontName = event.target.value;
    }, []);

    const handleSpacingChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        theme.spacing = event.target.valueAsNumber;
    }, []);

    const handleRoundingChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        theme.roundness = event.target.valueAsNumber;
    }, []);

    const handleFlatChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        theme.flat = event.target.checked;
    }, []);

    const suggest = useCallback(() => {
        if (suggestedColors && nextSuggestion) {
            const [color, textColor] = suggestedColors;
            theme.selected = {color, textColor};
            nextSuggestion();
        }
    }, [suggestedColors, nextSuggestion]);

    return (
        <form className="theme-editor" method="dialog" onSubmit={handleSubmit}>
            <div className="table-layout">
                <p className="theme-name">
                    <label htmlFor={`${id}-name`}>Name:</label>
                    <input
                        type="text"
                        id={`${id}-name`}
                        value={themeName}
                        spellCheck={false}
                        readOnly
                        tabIndex={-1}
                    />
                    <Button className="small" type="button" onClick={handleSaveAsClick}>
                        Save as…
                    </Button>
                </p>
                <p key={`${themeKey}/font`}>
                    <label htmlFor={`${id}-font`}>Font:</label>
                    <select
                        className="font-selector"
                        id={`${id}-font`}
                        defaultValue={currentTheme.fontName}
                        onChange={handleFontChange}
                    >
                        {fonts.map(({name, loaded}) => (
                            <option value={name} disabled={loaded === false} key={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                </p>
                <ThemeColorPair label="Frame" surface="frame" key={`${themeKey}/frame`} />
                <ThemeColorPair label="Content" surface="content" key={`${themeKey}/content`} />
                <ThemeColorPair label="Selection" surface="selected" key={`${themeKey}/selected`}>
                    <Button className="small" type="button" onClick={suggest}>
                        Suggest
                    </Button>
                </ThemeColorPair>
                <ThemeColorPair
                    label="Button"
                    surface="button"
                    Editor={ButtonEditor}
                    key={`${themeKey}/button`}
                />
                <ThemeColorPair
                    label="Media button"
                    surface="mediaButton"
                    Editor={MediaButtonEditor}
                    key={`${themeKey}/mediaButton`}
                />
                <ThemeColorPair
                    label="Scrollbar"
                    Editor={ScrollbarEditor}
                    surface="scrollbar"
                    key={`${themeKey}/scrollbar`}
                />
                <ThemeColorPair
                    label="Splitter"
                    surface="splitter"
                    Editor={SplitterEditor}
                    key={`${themeKey}/splitter`}
                />
                <p>
                    <label htmlFor={`${id}-spacing`}>Spacing:</label>
                    <input
                        type="range"
                        id={`${id}-spacing`}
                        min={0}
                        max={1}
                        step={0.01}
                        value={theme.spacing}
                        onChange={handleSpacingChange}
                    />
                </p>
                <p>
                    <label htmlFor={`${id}-roundness`}>Roundness:</label>
                    <input
                        type="range"
                        id={`${id}-roundness`}
                        min={0}
                        max={1}
                        step={0.01}
                        value={theme.roundness}
                        onChange={handleRoundingChange}
                    />
                </p>
                <p>
                    <label htmlFor={`${id}-flat`}>Flat:</label>
                    <input
                        type="checkbox"
                        id={`${id}-flat`}
                        checked={theme.flat}
                        onChange={handleFlatChange}
                    />
                </p>
            </div>
            <DialogButtons />
        </form>
    );
}
