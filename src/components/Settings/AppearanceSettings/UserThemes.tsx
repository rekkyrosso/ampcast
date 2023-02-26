import React, {useCallback, useEffect, useRef, useState} from 'react';
import themeStore from 'services/theme/themeStore';
import {prompt} from 'components/Dialog';
import {saveTextToFile} from 'utils';
import useUserThemes from './useUserThemes';
import confirmDeleteTheme from './confirmDeleteTheme';
import confirmOverwriteTheme from './confirmOverwriteTheme';
import importThemeFromFile from './importThemeFromFile';
import './UserThemes.scss';

export default function UserThemes() {
    const fileRef = useRef<HTMLInputElement>(null);
    const themesRef = useRef<HTMLSelectElement>(null);
    const themes = useUserThemes();
    const [selectedCount, setSelectedCount] = useState(0);
    const [renamed, setRenamed] = useState('');

    useEffect(() => {
        if (renamed && themes.find((theme) => theme.name === renamed)) {
            themesRef.current!.value = renamed;
            setRenamed('');
        }
    }, [themes, renamed]);

    const handleSelectionChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedCount(event.target.selectedOptions.length);
    }, []);

    const handleRenameClick = useCallback(async () => {
        const oldName = themesRef.current!.value;
        const newName = await prompt({
            title: 'My themes',
            value: oldName,
            buttonLabel: 'Rename',
            system: true,
        });
        if (newName) {
            const confirmed = await confirmOverwriteTheme(newName);
            if (confirmed) {
                await themeStore.rename(oldName, newName);
                setRenamed(newName);
            }
        }
    }, []);

    const handleExportClick = useCallback(async () => {
        const name = themesRef.current!.value;
        const theme = themeStore.getUserTheme(name);
        if (theme) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {userTheme, ...data} = theme;
            saveTextToFile(`${name}.json`, JSON.stringify(data, undefined, 4));
        }
    }, []);

    const handleDeleteClick = useCallback(async () => {
        const name = themesRef.current!.value;
        const confirmed = await confirmDeleteTheme(name);
        if (confirmed) {
            await themeStore.remove(name);
            setSelectedCount(0);
        }
    }, []);

    const handleImportClick = useCallback(() => {
        fileRef.current!.click();
    }, []);

    const handleFileImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target!.files?.[0];
        if (file) {
            await importThemeFromFile(file);
            event.target!.value = '';
        }
    }, []);

    return (
        <form className="user-themes" method="dialog">
            <fieldset>
                <legend>Saved themes</legend>
                <p>
                    <select size={8} ref={themesRef} onChange={handleSelectionChange}>
                        {themes.map((theme) => (
                            <option value={theme.name} key={theme.name}>
                                {theme.name}
                            </option>
                        ))}
                    </select>
                </p>
                <p className="user-themes-buttons">
                    <button
                        type="button"
                        onClick={handleRenameClick}
                        disabled={selectedCount === 0}
                    >
                        Rename…
                    </button>
                    <button
                        type="button"
                        onClick={handleExportClick}
                        disabled={selectedCount === 0}
                    >
                        Export…
                    </button>
                    <button
                        className="user-themes-delete"
                        type="button"
                        onClick={handleDeleteClick}
                        disabled={selectedCount === 0}
                    >
                        Delete
                    </button>
                </p>
            </fieldset>
            <fieldset>
                <legend>Import themes</legend>
                <p>
                    <input
                        type="file"
                        accept="text/json,.json"
                        onChange={handleFileImport}
                        ref={fileRef}
                    />
                    <button type="button" onClick={handleImportClick}>
                        Import…
                    </button>
                </p>
            </fieldset>
            <footer className="dialog-buttons">
                <button type="button" value="#cancel">
                    Cancel
                </button>
                <button>Confirm</button>
            </footer>
        </form>
    );
}
